// End-to-End Tests for Quarantine Game
const { chromium } = require('playwright');
const assert = require('assert');

/**
 * E2E test suite for Quarantine game core functionality
 */
describe('Quarantine Game E2E Tests', () => {
  let browser;
  let page;
  let apiMock;
  
  before(async () => {
    // Launch browser
    browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD environments
      slowMo: 100, // Slow down operations for visualization
    });
    
    // Create a new browser context and page
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
  });

  after(async () => {
    await browser.close();
  });

  /**
   * Test user authentication flow
   */
  describe('Authentication Flow', () => {
    it('should allow user to sign up', async () => {
      await page.goto('http://localhost:5173/sign-up-page');
      
      // Fill signup form with test user data
      await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'Password123!');
      
      // Submit the form
      await page.click('button[type="submit"]');
      
      // Verify redirect to character creation
      await page.waitForURL('**/character-creation-page');
      const currentUrl = page.url();
      assert(currentUrl.includes('character-creation-page'), 'Should redirect to character creation');
    });

    it('should allow user to log in', async () => {
      await page.goto('http://localhost:5173/login-page');
      
      // Fill login form
      await page.fill('input[name="email"]', 'test@example.com'); // Use a test account that exists
      await page.fill('input[name="password"]', 'Password123!');
      
      // Submit the form
      await page.click('button[type="submit"]');
      
      // Wait for redirect to game page
      await page.waitForURL('**/game-page');
      const currentUrl = page.url();
      assert(currentUrl.includes('game-page'), 'Should redirect to game page after login');
    });
  });

  /**
   * Test core game loop functionality
   */
  describe('Core Game Loop', () => {
    before(async () => {
      // Log in before testing game features
      await page.goto('http://localhost:5173/login-page');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/game-page');
    });

    it('should display stats', async () => {
      // Wait for stats to load
      await page.waitForSelector('[data-testid="stats-hud"]');
      
      // Verify all five stats are displayed
      const stats = await page.$$('[data-testid="stat-display"]');
      assert(stats.length === 5, 'Should display 5 stats (health, hunger, stress, tone, money)');
    });

    it('should allow scheduling activities', async () => {
      // Open timeline sidebar
      await page.waitForSelector('[data-testid="timeline-sidebar"]');
      
      // Find an activity and drag it to a time slot
      const activity = await page.locator('[data-testid="activity-item"]:first-child');
      const timeSlot = await page.locator('[data-testid="time-slot"]:nth-child(3)');
      
      // Get activity ID before drag
      const activityId = await activity.getAttribute('data-activity-id');
      
      // Perform drag and drop
      const activityBound = await activity.boundingBox();
      const timeSlotBound = await timeSlot.boundingBox();
      
      await page.mouse.move(
        activityBound.x + activityBound.width / 2,
        activityBound.y + activityBound.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        timeSlotBound.x + timeSlotBound.width / 2,
        timeSlotBound.y + timeSlotBound.height / 2
      );
      await page.mouse.up();
      
      // Verify activity was added to the schedule
      await page.waitForTimeout(500); // Wait for state update
      const slotActivity = await timeSlot.getAttribute('data-activity-id');
      assert(slotActivity === activityId, 'Activity should be added to schedule');
    });

    it('should simulate time progression', async () => {
      // Get initial hour
      const initialHour = await page.locator('[data-testid="game-hour"]').textContent();
      
      // Wait for game hour to change (assuming game speed is fast enough for testing)
      await page.waitForFunction(
        (initialHour) => {
          const currentHour = document.querySelector('[data-testid="game-hour"]').textContent;
          return currentHour !== initialHour;
        },
        initialHour,
        { timeout: 10000 }
      );
      
      // Get new hour
      const newHour = await page.locator('[data-testid="game-hour"]').textContent();
      assert(newHour !== initialHour, 'Game time should progress');
    });

    it('should update stats based on activities', async () => {
      // Get initial stats
      const initialStats = await getStats(page);
      
      // Set a work activity for the next hour
      const workActivity = await page.locator('[data-activity-id="work"]');
      const nextHourSlot = await page.locator('[data-testid="time-slot"]:nth-child(2)');
      
      // Perform drag and drop
      const activityBound = await workActivity.boundingBox();
      const slotBound = await nextHourSlot.boundingBox();
      
      await page.mouse.move(
        activityBound.x + activityBound.width / 2,
        activityBound.y + activityBound.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        slotBound.x + slotBound.width / 2,
        slotBound.y + slotBound.height / 2
      );
      await page.mouse.up();
      
      // Wait for hour to change and activity to take effect
      await page.waitForFunction(
        () => {
          // Check if stats have changed
          const hungerText = document.querySelector('[data-stat="hunger"]').textContent;
          const hunger = parseInt(hungerText.match(/\d+/)[0], 10);
          return hunger !== initialStats.hunger;
        },
        { timeout: 20000 }
      );
      
      // Get new stats
      const newStats = await getStats(page);
      
      // Verify work effects (hunger -5, stress +5, tone -5, money +10)
      assert(newStats.hunger < initialStats.hunger, 'Work should decrease hunger');
      assert(newStats.stress > initialStats.stress, 'Work should increase stress');
      assert(newStats.tone < initialStats.tone, 'Work should decrease tone/energy');
      assert(newStats.money > initialStats.money, 'Work should increase money');
    });
  });

  /**
   * Test shop and monetization features
   */
  describe('Shop and Monetization', () => {
    before(async () => {
      // Navigate to the shop page
      await page.goto('http://localhost:5173/shop');
      await page.waitForSelector('[data-testid="shop-page"]');
    });

    it('should display shop items', async () => {
      // Verify shop items are displayed
      const shopItems = await page.$$('[data-testid="shop-item"]');
      assert(shopItems.length > 0, 'Shop should display items');
    });

    it('should allow in-game currency purchases', async () => {
      // Get initial money amount
      const initialMoney = await page.locator('[data-testid="money-display"]').textContent();
      const moneyValue = parseInt(initialMoney.match(/\d+/)[0], 10);
      
      // Find a cheap in-game purchase
      const inGameItem = await page.locator('[data-purchase-type="in_game"]:first-child');
      const itemPrice = await inGameItem.locator('[data-testid="item-price"]').textContent();
      const price = parseInt(itemPrice.match(/\d+/)[0], 10);
      
      // Ensure we have enough money
      if (moneyValue < price) {
        console.log('Not enough money for purchase, skipping test');
        return;
      }
      
      // Click the buy button
      await inGameItem.locator('button:has-text("Buy")').click();
      
      // Wait for purchase to complete
      await page.waitForSelector('text=Successfully purchased');
      
      // Verify money was deducted
      await page.waitForFunction(
        (initialMoney) => {
          const newMoney = document.querySelector('[data-testid="money-display"]').textContent;
          const newValue = parseInt(newMoney.match(/\d+/)[0], 10);
          return newValue < initialMoney;
        },
        moneyValue,
        { timeout: 5000 }
      );
    });

    it('should display Stripe payment flow for real-money purchases', async () => {
      // Find a real-money purchase item
      const realMoneyItem = await page.locator('[data-purchase-type="real_money"]:first-child');
      
      // Click the buy button
      await realMoneyItem.locator('button:has-text("Buy")').click();
      
      // Wait for Stripe payment dialog
      await page.waitForSelector('[data-testid="stripe-element"]', { timeout: 10000 });
      
      // Verify Stripe elements are loaded
      const stripeForm = await page.$('[data-testid="stripe-element"]');
      assert(stripeForm !== null, 'Stripe payment form should be displayed');
      
      // Don't submit payment, just verify UI flow
      await page.click('button:has-text("Cancel")');
    });
  });

  /**
   * Test random events
   */
  describe('Random Events', () => {
    it('should handle random events', async () => {
      // Go to game page
      await page.goto('http://localhost:5173/game-page');
      
      // Manually trigger an event for testing
      await page.evaluate(() => {
        // Access debug function to trigger event
        window.triggerRandomEvent();
      });
      
      // Wait for event popup
      await page.waitForSelector('[data-testid="event-popup"]', { timeout: 10000 });
      
      // Verify event elements
      const eventTitle = await page.textContent('[data-testid="event-title"]');
      const eventOptions = await page.$$('[data-testid="event-option"]');
      
      assert(eventTitle.length > 0, 'Event should have a title');
      assert(eventOptions.length > 0, 'Event should have options');
      
      // Select an option
      await eventOptions[0].click();
      
      // Verify event is processed and closed
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="event-popup"]'),
        { timeout: 5000 }
      );
    });
  });
});

/**
 * Helper function to get current stats from the UI
 */
async function getStats(page) {
  const hungerText = await page.locator('[data-stat="hunger"]').textContent();
  const stressText = await page.locator('[data-stat="stress"]').textContent();
  const toneText = await page.locator('[data-stat="tone"]').textContent();
  const healthText = await page.locator('[data-stat="health"]').textContent();
  const moneyText = await page.locator('[data-stat="money"]').textContent();
  
  return {
    hunger: parseInt(hungerText.match(/\d+/)[0], 10),
    stress: parseInt(stressText.match(/\d+/)[0], 10),
    tone: parseInt(toneText.match(/\d+/)[0], 10),
    health: parseInt(healthText.match(/\d+/)[0], 10),
    money: parseInt(moneyText.match(/\d+/)[0], 10),
  };
} 