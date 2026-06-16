import { Page, Locator, expect } from '@playwright/test';
import { raceAgainstErrorToast } from './toast-helpers';

// KCT (Khung chương trình) list + detail (incl. tree CRUD on detail).
// Sources:
//   src/components/pages/curriculum-frame/index.tsx:499-501 — list h1
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkCard.tsx:91-93,110-115 — card nav
//   src/components/pages/curriculum-frame/CurriculumFrameworkDetail.tsx:482-487,526-545,588-593 — detail anchors
//   src/components/pages/curriculum-frame/CurriculumFrameworkDetail.tsx:531-541 — header "Thêm" button
//   src/components/pages/curriculum-frame/components/Modals/AddSubjectModal.tsx:46-67 — AddSubjectModal
//   src/components/pages/curriculum-frame/components/TreeNode.tsx:109-128,146-181,220-275,341-391 — chevron, rename row, hover actions, inline add row
//   src/components/Modals/DeleteConfirmDialog.tsx:14-33 — title='Xác nhận xóa', confirmText='Xóa', abortText='Hủy bỏ'
//   CurriculumFrameworkDetail.tsx toasts: 'Đã thêm cấp mới'(308), 'Đã thêm nhánh con'(223), 'Đã cập nhật tên'(341), 'Đã xóa thành công'(263), 'Tên không được để trống'(190,286,321)
export class CurriculumDetailPage {
  readonly listHeading: Locator;
  readonly listEmptyState: Locator;
  readonly frameworkCards: Locator;
  readonly detailHeading: Locator;
  readonly detailSubtitle: Locator;
  readonly treeSectionLabel: Locator;
  readonly maxDepthLabel: Locator;
  readonly treeEmptyState: Locator;

  // Tree CRUD anchors.
  readonly addRootButton: Locator;
  readonly addSubjectDialog: Locator;
  readonly addSubjectNameInput: Locator;
  readonly addSubjectConfirm: Locator;
  readonly addSubjectCancel: Locator;
  readonly treeDeleteDialog: Locator;
  readonly treeDeleteConfirm: Locator;
  readonly treeDeleteCancel: Locator;

  constructor(private readonly page: Page) {
    // List page (/curriculum).
    this.listHeading = page.getByRole('heading', {
      name: 'Quản lý khung chương trình',
      exact: true,
    });
    this.listEmptyState = page.getByText('Chưa có khung chương trình nào', { exact: true });
    // CurriculumFrameworkCard renders shadcn Card; CardTitle (= <h3>) has class line-clamp-2 text-base.
    this.frameworkCards = page.locator('h3.line-clamp-2');

    // Detail page (/curriculum/[id]).
    // h1 = framework.name (text-3xl font-bold). Use h1 + class anchor since name dynamic.
    this.detailHeading = page.locator('h1.text-3xl.font-bold').first();
    this.detailSubtitle = page.getByText(/Cấu trúc cây kiến thức/);
    this.treeSectionLabel = page.getByText('Cây kiến thức', { exact: true });
    this.maxDepthLabel = page.getByText(/Độ sâu tối đa:\s*10\s*cấp/);
    // Empty tree: FolderOpen icon + "Chưa có dữ liệu".
    this.treeEmptyState = page.getByText('Chưa có dữ liệu', { exact: true });

    // Header "Thêm" button (root add) — gated by canInsert && !isPublished.
    this.addRootButton = page.getByRole('button', { name: 'Thêm', exact: true });

    // AddSubjectModal — title = "Thêm cấp mới" (levelName='cấp' from CurriculumFrameworkDetail.tsx:469).
    this.addSubjectDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Thêm cấp mới',
    });
    this.addSubjectNameInput = this.addSubjectDialog.locator('input#node-name');
    this.addSubjectConfirm = this.addSubjectDialog.getByRole('button', { name: 'Xác nhận', exact: true });
    this.addSubjectCancel = this.addSubjectDialog.getByRole('button', { name: 'Hủy', exact: true });

    // Tree delete confirm — DeleteConfirmDialog (default title "Xác nhận xóa").
    // Description starts "Bạn có chắc chắn muốn xóa" — disambiguates from list-page delete dialog
    // which uses different title "Xác nhận xóa khung chương trình".
    this.treeDeleteDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Bạn có chắc chắn muốn xóa',
    });
    this.treeDeleteConfirm = this.treeDeleteDialog.getByRole('button', { name: 'Xóa', exact: true });
    this.treeDeleteCancel = this.treeDeleteDialog.getByRole('button', { name: 'Hủy bỏ', exact: true });
  }

  async gotoList(): Promise<void> {
    await this.page.goto('/curriculum');
    await this.listHeading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(`/curriculum/${id}`);
    await this.expectDetailLoaded();
  }

  async openFirstFramework(): Promise<void> {
    // Try each card until one detail page loads. Some frameworks may be permission-gated
    // (Hasura RLS returns null for non-owner non-public). Component returns null then router bounces.
    const cardHeaders = this.page.locator('div.cursor-pointer:has(> div > h3.line-clamp-2)');
    await cardHeaders.first().waitFor({ state: 'visible', timeout: 10_000 });
    const count = await cardHeaders.count();
    for (let i = 0; i < count; i++) {
      await cardHeaders.nth(i).click();
      const matchedDetail = await this.detailSubtitle
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (matchedDetail) return;
      if (!this.page.url().match(/\/curriculum\/?$/)) {
        await this.gotoList();
        await cardHeaders.first().waitFor({ state: 'visible', timeout: 10_000 });
      }
    }
    throw new Error('No curriculum framework viewable for test user');
  }

  async expectDetailLoaded(): Promise<void> {
    await expect(this.detailHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.detailSubtitle).toBeVisible();
    await expect(this.treeSectionLabel).toBeVisible();
    await expect(this.maxDepthLabel).toBeVisible();
  }

  async hasFrameworkCard(): Promise<boolean> {
    // Wait for Apollo query: first card OR empty state, whichever shows first.
    await Promise.race([
      this.frameworkCards.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
      this.listEmptyState.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
    ]);
    return (await this.frameworkCards.count()) > 0;
  }

  // ── Tree node helpers ─────────────────────────────────────────────────────

  // Anchor on the row's own label (TreeNode.tsx:195 — div.single-line-node renders node.name
  // via LatexEditor). Each row has its OWN single-line-node — text = only this node's name,
  // descendants never contaminate. Walk up to the row's group/node wrapper.
  // Tailwind class `group/node` (with `/`) is awkward in CSS class selectors → XPath ancestor.
  nodeRowByName(name: string): Locator {
    return this.page
      .locator('div.single-line-node')
      .filter({ hasText: name })
      .first()
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " group/node ")][1]',
      );
  }

  // Chevron toggle button — aria-label="Toggle" (TreeNode.tsx:121).
  // Waits for the row itself to render first — parent expand triggers lazy child query.
  async expandNode(name: string): Promise<void> {
    const row = this.nodeRowByName(name);
    await row.waitFor({ state: 'visible', timeout: 15_000 });
    const toggle = row.locator('button[aria-label="Toggle"]').first();
    const collapsedIcon = toggle.locator('svg.lucide-chevron-right');
    if ((await collapsedIcon.count()) > 0) {
      await toggle.click();
      await expect(toggle.locator('svg.lucide-chevron-down')).toBeVisible({ timeout: 10_000 });
    }
  }

  // ── Tree CRUD ─────────────────────────────────────────────────────────────

  async openAddRootModal(): Promise<void> {
    await this.addRootButton.click();
    await expect(this.addSubjectDialog).toBeVisible({ timeout: 5_000 });
  }

  // Add root node via AddSubjectModal → toast "Đã thêm cấp mới".
  async addRootNode(name: string): Promise<void> {
    await this.openAddRootModal();
    await this.addSubjectNameInput.fill(name);
    await this.addSubjectConfirm.click();
    const success = expect(
      this.page.getByText('Đã thêm cấp mới', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Add root tree node', 15_000);
    await expect(this.addSubjectDialog).toBeHidden({ timeout: 10_000 });
    await expect(this.nodeRowByName(name)).toBeVisible({ timeout: 15_000 });
  }

  // Add child to existing node — hover row → Plus title="Thêm nhánh con" → inline input row → Check title="Xác nhận".
  // Component auto-expands parent on add (TreeNode.tsx:227-228).
  async addChildToNode(parentName: string, childName: string): Promise<void> {
    const parentRow = this.nodeRowByName(parentName);
    await parentRow.hover();
    await parentRow.getByRole('button', { name: 'Thêm nhánh con' }).first().click();
    // Inline add row appears as sibling block (TreeNode.tsx:341) with Input placeholder="Nhập tên..".
    const inlineInput = this.page.locator('input[placeholder="Nhập tên.."]').first();
    await inlineInput.waitFor({ state: 'visible', timeout: 5_000 });
    await inlineInput.fill(childName);
    await this.page.getByRole('button', { name: 'Xác nhận' }).first().click();
    const success = expect(
      this.page.getByText('Đã thêm nhánh con', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Add child tree node', 15_000);
    await expect(this.nodeRowByName(childName)).toBeVisible({ timeout: 15_000 });
  }

  // Rename node via MoreVertical → menuitem "Đổi tên" → inline rename row → "Xác nhận".
  async renameNode(oldName: string, newName: string): Promise<void> {
    const row = this.nodeRowByName(oldName);
    await row.hover();
    // Row hover-actions contain Plus (title="Thêm nhánh con") + MoreVertical (DropdownMenuTrigger).
    // Both are h-7 w-7 ghost icon buttons. MoreVertical = last one (TreeNode.tsx:238-249).
    const iconButtons = row.locator('button.h-7.w-7');
    await iconButtons.last().click();
    await this.page.getByRole('menuitem', { name: 'Đổi tên', exact: true }).click();
    // Inline rename input replaces the LatexEditor (TreeNode.tsx:148-163).
    const inlineInput = this.page.locator('input[placeholder="Nhập tên.."]').first();
    await inlineInput.waitFor({ state: 'visible', timeout: 5_000 });
    await inlineInput.fill(newName);
    await this.page.getByRole('button', { name: 'Xác nhận' }).first().click();
    const success = expect(
      this.page.getByText('Đã cập nhật tên', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Rename tree node', 15_000);
    await expect(this.nodeRowByName(newName)).toBeVisible({ timeout: 15_000 });
  }

  // Delete node via MoreVertical → menuitem "Xóa" → DeleteConfirmDialog "Xóa".
  async deleteNode(name: string): Promise<void> {
    const row = this.nodeRowByName(name);
    await row.hover();
    const iconButtons = row.locator('button.h-7.w-7');
    await iconButtons.last().click();
    await this.page.getByRole('menuitem', { name: 'Xóa', exact: true }).click();
    await expect(this.treeDeleteDialog).toBeVisible({ timeout: 5_000 });
    await this.treeDeleteConfirm.click();
    const success = expect(
      this.page.getByText('Đã xóa thành công', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Delete tree node', 15_000);
    await expect(this.treeDeleteDialog).toBeHidden({ timeout: 10_000 });
  }

  async expectNodeHidden(name: string): Promise<void> {
    await expect(this.nodeRowByName(name)).toHaveCount(0, { timeout: 15_000 });
  }
}
