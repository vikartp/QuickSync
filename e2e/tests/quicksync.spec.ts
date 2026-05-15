import { test, expect } from '@playwright/test';

test.describe('QuickSync WebRTC P2P Tests', () => {
  test('Two users can join the same channel and connect', async ({ browser }) => {
    // 1. Create two separate browser windows to simulate Alice and Bob
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const pageA = await userAContext.newPage();
    const pageB = await userBContext.newPage();

    // 2. Both users navigate to the app
    await pageA.goto('/');
    await pageB.goto('/');

    // 3. Alice joins
    await pageA.fill('input[placeholder="Enter your name"]', 'Alice');
    await pageA.fill('input[placeholder="e.g. daily-standup"]', 'e2e-test-room');
    await pageA.fill('input[placeholder="Required for access"]', 'my_secure_secret_123');
    await pageA.click('button:has-text("Join Meeting")');

    // 4. Bob joins
    await pageB.fill('input[placeholder="Enter your name"]', 'Bob');
    await pageB.fill('input[placeholder="e.g. daily-standup"]', 'e2e-test-room');
    await pageB.fill('input[placeholder="Required for access"]', 'my_secure_secret_123');
    await pageB.click('button:has-text("Join Meeting")');

    // 5. Verify both are in the room
    await expect(pageA.locator('text=Channel: #e2e-test-room')).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator('text=Channel: #e2e-test-room')).toBeVisible({ timeout: 10000 });

    // 6. Test WebSocket Signaling / Chat
    await pageA.fill('input[placeholder="Type a message..."]', 'Hello from Alice!');
    await pageA.click('button[type="submit"]');

    // Bob should receive the chat instantly
    await expect(pageB.locator('text=Hello from Alice!')).toBeVisible();

    // 7. Test WebRTC Fake Media Tunneling
    // Alice turns on her camera
    await pageA.click('button[title="Start Camera"]');
    
    // Because of `--use-fake-device-for-media-stream`, Alice sends a fake video stream.
    // Verify Bob's UI renders the incoming WebRTC video stream.
    const bobVideo = pageB.locator('video:visible');
    await expect(bobVideo).toBeVisible();

    // Clean up
    await userAContext.close();
    await userBContext.close();
  });
});
