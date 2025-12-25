const { test, expect } = require('@playwright/test');

/**
 * v3.2 Feature Tests: Procedure Checklist
 *
 * This test suite verifies the procedure checklist functionality
 * added in v3.2 of the Digital Reaction Planner.
 */

test.describe('v3.2 Feature: Procedure Checklist', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('http://localhost:3000');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');
    });

    test('Add step input and button should be visible', async ({ page }) => {
        const input = page.locator('#new-step-input');
        const button = page.locator('#add-step-btn');

        await expect(input).toBeVisible();
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Add Step');
    });

    test('Progress badge should be visible with initial 0/0', async ({ page }) => {
        const badge = page.locator('#procedure-progress');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText('0/0');
    });

    test('Should add a new step when clicking Add Step button', async ({ page }) => {
        await page.fill('#new-step-input', 'Test step 1');
        await page.click('#add-step-btn');

        await expect(page.locator('.procedure-item')).toHaveCount(1);
        await expect(page.locator('.step-text')).toContainText('Test step 1');
        await expect(page.locator('#procedure-progress')).toHaveText('0/1');
    });

    test('Should add a new step when pressing Enter key', async ({ page }) => {
        await page.fill('#new-step-input', 'Enter key step');
        await page.press('#new-step-input', 'Enter');

        await expect(page.locator('.procedure-item')).toHaveCount(1);
        await expect(page.locator('.step-text')).toContainText('Enter key step');
    });

    test('Should clear input after adding step', async ({ page }) => {
        await page.fill('#new-step-input', 'Clear test');
        await page.click('#add-step-btn');

        await expect(page.locator('#new-step-input')).toHaveValue('');
    });

    test('Should not add empty step', async ({ page }) => {
        await page.fill('#new-step-input', '   ');
        await page.click('#add-step-btn');

        await expect(page.locator('.procedure-item')).toHaveCount(0);
    });

    test('Should toggle step completion', async ({ page }) => {
        await page.fill('#new-step-input', 'Toggle test');
        await page.click('#add-step-btn');

        // Initially not done
        await expect(page.locator('.step-text')).not.toHaveClass(/done/);
        await expect(page.locator('#procedure-progress')).toHaveText('0/1');

        // Click checkbox to mark done
        await page.click('.step-checkbox');

        await expect(page.locator('.step-text')).toHaveClass(/done/);
        await expect(page.locator('#procedure-progress')).toHaveText('1/1');

        // Click again to unmark
        await page.click('.step-checkbox');
        await expect(page.locator('.step-text')).not.toHaveClass(/done/);
        await expect(page.locator('#procedure-progress')).toHaveText('0/1');
    });

    test('Should delete a step', async ({ page }) => {
        await page.fill('#new-step-input', 'Delete test');
        await page.click('#add-step-btn');

        await expect(page.locator('.procedure-item')).toHaveCount(1);

        await page.click('.step-delete-btn');

        await expect(page.locator('.procedure-item')).toHaveCount(0);
        await expect(page.locator('#procedure-progress')).toHaveText('0/0');
    });

    test('Should update observation', async ({ page }) => {
        await page.fill('#new-step-input', 'Observation test');
        await page.click('#add-step-btn');

        await page.fill('.observation-input', 'White precipitate formed');

        // Verify value is set
        await expect(page.locator('.observation-input')).toHaveValue('White precipitate formed');
    });

    test('Steps should persist after page reload', async ({ page }) => {
        // Add a step
        await page.fill('#new-step-input', 'Persist test step');
        await page.click('#add-step-btn');

        // Mark as done
        await page.click('.step-checkbox');

        // Add observation
        await page.fill('.observation-input', 'Test observation');

        // Reload page
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Verify persistence
        await expect(page.locator('.step-text')).toContainText('Persist test step');
        await expect(page.locator('.step-text')).toHaveClass(/done/);
        await expect(page.locator('.observation-input')).toHaveValue('Test observation');
        await expect(page.locator('#procedure-progress')).toHaveText('1/1');
    });

    test('Should add multiple steps', async ({ page }) => {
        await page.fill('#new-step-input', 'Step 1');
        await page.click('#add-step-btn');

        await page.fill('#new-step-input', 'Step 2');
        await page.click('#add-step-btn');

        await page.fill('#new-step-input', 'Step 3');
        await page.click('#add-step-btn');

        await expect(page.locator('.procedure-item')).toHaveCount(3);
        await expect(page.locator('#procedure-progress')).toHaveText('0/3');

        // Complete 2 steps
        await page.click('.step-checkbox >> nth=0');
        await page.click('.step-checkbox >> nth=2');

        await expect(page.locator('#procedure-progress')).toHaveText('2/3');
    });

    test('Progress badge should update correctly', async ({ page }) => {
        await page.fill('#new-step-input', 'Step 1');
        await page.click('#add-step-btn');
        await page.fill('#new-step-input', 'Step 2');
        await page.click('#add-step-btn');

        await expect(page.locator('#procedure-progress')).toHaveText('0/2');

        await page.click('.step-checkbox >> nth=0');
        await expect(page.locator('#procedure-progress')).toHaveText('1/2');

        await page.click('.step-checkbox >> nth=1');
        await expect(page.locator('#procedure-progress')).toHaveText('2/2');
    });
});

test.describe('v3.2 Feature: Backward Compatibility (Notes Migration)', () => {
    test('Should migrate old notes to steps', async ({ page }) => {
        // Inject old format data with notes
        await page.goto('http://localhost:3000');
        await page.evaluate(() => {
            const oldData = {
                startingMaterial: { cas: '', mw: '', mass: '', smiles: '' },
                reagents: [],
                conditions: {
                    solventName: 'DCM',
                    solventCAS: '',
                    solventBP: '',
                    solventConc: '',
                    temperature: '25°C',
                    time: '2h',
                    notes: 'This is an old note that should be migrated'
                },
                product: { smiles: '', cas: '', mw: '', name: '' }
            };
            localStorage.setItem('reactionPlanData', JSON.stringify(oldData));
        });

        // Reload to trigger migration
        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Verify migration
        await expect(page.locator('.step-text')).toContainText('This is an old note that should be migrated');
        await expect(page.locator('.procedure-item')).toHaveCount(1);
        await expect(page.locator('#procedure-progress')).toHaveText('0/1');
    });

    test('Should handle empty notes gracefully', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.evaluate(() => {
            const oldData = {
                startingMaterial: {},
                reagents: [],
                conditions: { notes: '' },
                product: {}
            };
            localStorage.setItem('reactionPlanData', JSON.stringify(oldData));
        });

        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        // Should show empty state
        await expect(page.locator('.procedure-item')).toHaveCount(0);
        await expect(page.locator('#procedure-progress')).toHaveText('0/0');
    });

    test('Should preserve new steps format correctly', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.evaluate(() => {
            const newData = {
                startingMaterial: {},
                reagents: [],
                conditions: {
                    steps: [
                        { id: 'step-1', text: 'Existing step 1', isDone: true, observation: 'Done!' },
                        { id: 'step-2', text: 'Existing step 2', isDone: false, observation: '' }
                    ]
                },
                product: {}
            };
            localStorage.setItem('reactionPlanData', JSON.stringify(newData));
        });

        await page.reload();
        await page.waitForSelector('#reaction-scheme-section');

        await expect(page.locator('.procedure-item')).toHaveCount(2);
        await expect(page.locator('.step-text >> nth=0')).toContainText('Existing step 1');
        await expect(page.locator('.step-text >> nth=0')).toHaveClass(/done/);
        await expect(page.locator('.observation-input >> nth=0')).toHaveValue('Done!');
        await expect(page.locator('#procedure-progress')).toHaveText('1/2');
    });
});

test.describe('v3.2 Feature: UI Verification', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#reaction-scheme-section');
    });

    test('Notes textarea should NOT exist (replaced by procedure)', async ({ page }) => {
        await expect(page.locator('#notes')).toHaveCount(0);
    });

    test('Procedure section should be in conditions section', async ({ page }) => {
        const procedureSection = page.locator('#conditions-section .procedure-section');
        await expect(procedureSection).toBeVisible();
    });

    test('Procedure header should have correct title', async ({ page }) => {
        const header = page.locator('.procedure-header h3');
        await expect(header).toHaveText('Procedure Checklist');
    });
});
