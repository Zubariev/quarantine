// Monetization Flow Tests for Quarantine Game
const { chromium } = require('playwright');
const assert = require('assert');

/**
 * Test suite for Stripe payment flows in Quarantine game
 */
describe('Quarantine Game Monetization Tests', () => {
  let browser;
  let page;
  
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
    
    // Login before running monetization tests
    await login(page);
  });

  after(async () => {
    await browser.close();
  });

  /**
   * Test in-game currency purchases
   */
  describe('In-Game Currency Purchases', () => {
    before(async () => {
      // Navigate to shop
      await page.goto('http://localhost:5173/shop');
      await page.waitForSelector('[data-testid="shop-page"]');
    });
    
    it('should successfully purchase an item with in-game currency', async () => {
      // Get initial money amount
      const initialMoney = await page.locator('[data-testid="money-display"]').textContent();
      const moneyValue = parseInt(initialMoney.match(/\d+/)[0], 10);
      
      // Find in-game purchase items
      const inGameItems = await page.locator('[data-purchase-type="in_game"]').all();
      
      // Find an item we can afford
      let affordableItem = null;
      for (const item of inGameItems) {
        const priceText = await item.locator('[data-testid="item-price"]').textContent();
        const price = parseInt(priceText.match(/\d+/)[0], 10);
        
        if (price < moneyValue) {
          affordableItem = item;
          break;
        }
      }
      
      if (!affordableItem) {
        console.log('No affordable items found, skipping test');
        return;
      }
      
      // Get item details for verification
      const itemName = await affordableItem.locator('[data-testid="item-name"]').textContent();
      const itemPrice = await affordableItem.locator('[data-testid="item-price"]').textContent();
      const price = parseInt(itemPrice.match(/\d+/)[0], 10);
      
      // Click buy button
      await affordableItem.locator('button:has-text("Buy")').click();
      
      // Verify toast confirmation appears
      await page.waitForSelector('text=Successfully purchased');
      
      // Check inventory to verify item was added
      await page.click('button:has-text("Inventory")');
      await page.waitForSelector('[data-testid="inventory-tab"]');
      
      // Look for the item in inventory
      const inventoryItems = await page.locator('[data-testid="inventory-item"]').all();
      let found = false;
      
      for (const invItem of inventoryItems) {
        const invItemName = await invItem.locator('[data-testid="inventory-item-name"]').textContent();
        if (invItemName.includes(itemName)) {
          found = true;
          break;
        }
      }
      
      assert(found, 'Purchased item should appear in inventory');
      
      // Verify money was deducted
      const newMoneyText = await page.locator('[data-testid="money-display"]').textContent();
      const newMoney = parseInt(newMoneyText.match(/\d+/)[0], 10);
      
      assert(newMoney === moneyValue - price, 'Money should be deducted by the item price');
    });
    
    it('should prevent purchase if not enough currency', async () => {
      // Navigate back to shop tab
      await page.click('button:has-text("Shop")');
      await page.waitForSelector('[data-testid="shop-tab"]');
      
      // Get current money
      const moneyText = await page.locator('[data-testid="money-display"]').textContent();
      const money = parseInt(moneyText.match(/\d+/)[0], 10);
      
      // Find an expensive item (costs more than current money)
      const expensiveItems = await page.locator('[data-purchase-type="in_game"]').all();
      let expensiveItem = null;
      
      for (const item of expensiveItems) {
        const priceText = await item.locator('[data-testid="item-price"]').textContent();
        const price = parseInt(priceText.match(/\d+/)[0], 10);
        
        if (price > money) {
          expensiveItem = item;
          break;
        }
      }
      
      if (!expensiveItem) {
        console.log('No expensive items found, skipping test');
        return;
      }
      
      // Verify buy button is disabled
      const buyButton = await expensiveItem.locator('button:has-text("Buy")');
      const isDisabled = await buyButton.isDisabled();
      
      assert(isDisabled, 'Buy button should be disabled when not enough money');
    });
  });

  /**
   * Test Stripe payment integration
   */
  describe('Stripe Payment Integration', () => {
    before(async () => {
      // Navigate to shop
      await page.goto('http://localhost:5173/shop');
      await page.waitForSelector('[data-testid="shop-page"]');
    });
    
    it('should open Stripe payment modal for real-money purchases', async () => {
      // Find a real-money purchase item
      const realMoneyItem = await page.locator('[data-purchase-type="real_money"]:first-child');
      
      // Get item details
      const itemName = await realMoneyItem.locator('[data-testid="item-name"]').textContent();
      const itemPrice = await realMoneyItem.locator('[data-testid="item-price"]').textContent();
      
      // Click buy button
      await realMoneyItem.locator('button:has-text("Buy")').click();
      
      // Wait for Stripe payment form
      await page.waitForSelector('[data-testid="stripe-element"]');
      
      // Check if item details are shown in payment modal
      const modalText = await page.locator('[data-testid="payment-modal"]').textContent();
      assert(modalText.includes(itemName), 'Payment modal should show item name');
      assert(modalText.includes(itemPrice.replace('$', '')), 'Payment modal should show price');
    });
    
    it('should process test payments with Stripe test cards', async () => {
      // Find a real-money purchase item
      const realMoneyItem = await page.locator('[data-purchase-type="real_money"]:first-child');
      
      // Click buy button
      await realMoneyItem.locator('button:has-text("Buy")').click();
      
      // Wait for Stripe payment form
      await page.waitForSelector('[data-testid="stripe-element"]');
      
      // Fill test card details (using Stripe test card)
      // Note: CardElement is an iframe, so we need frames handling
      const cardFrame = await page.frameLocator('[name^="__privateStripeFrame"]').first();
      
      // Type card number
      await cardFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
      
      // Type expiration date
      await cardFrame.locator('[placeholder="MM / YY"]').fill('12/30');
      
      // Type CVC
      await cardFrame.locator('[placeholder="CVC"]').fill('123');
      
      // Type postal code
      await cardFrame.locator('[placeholder="ZIP"]').fill('12345');
      
      // Submit payment
      await page.locator('button:has-text("Pay Now")').click();
      
      // Wait for success message (there should be a success toast or message)
      await page.waitForSelector('text=Payment successful', { timeout: 10000 });
      
      // Verify item added to inventory
      await page.click('button:has-text("Inventory")');
      
      // Check that inventory has the purchased item
      await page.waitForSelector('[data-testid="inventory-tab"]');
      const inventoryCount = await page.locator('[data-testid="inventory-item"]').count();
      
      assert(inventoryCount > 0, 'Inventory should have at least one item after purchase');
    });
    
    it('should handle payment cancellation', async () => {
      // Go back to shop tab
      await page.click('button:has-text("Shop")');
      
      // Find a real-money purchase item
      const realMoneyItem = await page.locator('[data-purchase-type="real_money"]:first-child');
      
      // Click buy button
      await realMoneyItem.locator('button:has-text("Buy")').click();
      
      // Wait for Stripe payment form
      await page.waitForSelector('[data-testid="stripe-element"]');
      
      // Click cancel button
      await page.locator('button:has-text("Cancel")').click();
      
      // Verify the modal is closed
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="payment-modal"]'),
        { timeout: 5000 }
      );
    });
    
    it('should handle declined payments', async () => {
      // Find a real-money purchase item
      const realMoneyItem = await page.locator('[data-purchase-type="real_money"]:first-child');
      
      // Click buy button
      await realMoneyItem.locator('button:has-text("Buy")').click();
      
      // Wait for Stripe payment form
      await page.waitForSelector('[data-testid="stripe-element"]');
      
      // Fill with declined test card
      const cardFrame = await page.frameLocator('[name^="__privateStripeFrame"]').first();
      
      // Type declined card number
      await cardFrame.locator('[placeholder="Card number"]').fill('4000000000000002');
      
      // Type expiration date
      await cardFrame.locator('[placeholder="MM / YY"]').fill('12/30');
      
      // Type CVC
      await cardFrame.locator('[placeholder="CVC"]').fill('123');
      
      // Type postal code
      await cardFrame.locator('[placeholder="ZIP"]').fill('12345');
      
      // Submit payment
      await page.locator('button:has-text("Pay Now")').click();
      
      // Wait for declined message
      await page.waitForSelector('text=Card declined', { timeout: 10000 });
    });
  });

  /**
   * Test item usage effects
   */
  describe('Item Usage', () => {
    before(async () => {
      // Navigate to inventory
      await page.goto('http://localhost:5173/shop');
      await page.click('button:has-text("Inventory")');
      await page.waitForSelector('[data-testid="inventory-tab"]');
    });
    
    it('should apply stat effects when using items', async () => {
      // Check if inventory has any items
      const inventoryItems = await page.locator('[data-testid="inventory-item"]').all();
      
      if (inventoryItems.length === 0) {
        console.log('No inventory items to test, skipping');
        return;
      }
      
      // Get initial stats
      await page.goto('http://localhost:5173/game-page');
      const initialStats = await getStats(page);
      
      // Go back to inventory
      await page.goto('http://localhost:5173/shop');
      await page.click('button:has-text("Inventory")');
      
      // Use first item in inventory
      const useButton = await page.locator('button:has-text("Use Item")').first();
      await useButton.click();
      
      // Wait for confirmation
      await page.waitForSelector('text=Item used successfully');
      
      // Go to game page to check stats
      await page.goto('http://localhost:5173/game-page');
      
      // Get updated stats
      const newStats = await getStats(page);
      
      // Verify at least one stat changed (we don't know which one specifically)
      const hasChanges = Object.keys(initialStats).some(key => 
        initialStats[key] !== newStats[key]
      );
      
      assert(hasChanges, 'Using an item should change at least one stat');
    });
  });
});

/**
 * Helper to log in before tests
 */
async function login(page) {
  await page.goto('http://localhost:5173/login-page');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/game-page');
}

/**
 * Helper to get current stats
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