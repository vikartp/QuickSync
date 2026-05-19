import { test, expect } from '@playwright/test';

test.describe('QuickSync WebRTC P2P Tests', () => {
  test('Two users can join the same channel and connect', async ({ browser }) => {
    // 1. Create two separate browser windows to simulate Alice and Bob
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const pageA = await userAContext.newPage();
    const pageB = await userBContext.newPage();

    // 2. Alice creates a meeting from the auth page
    await pageA.goto('/auth');
    await pageA.fill('input[placeholder="Your display name"]', 'Alice');
    await pageA.click('button:has-text("Start Meeting")');

    // 3. Wait for Alice to be redirected to the meeting room
    await expect(pageA).toHaveURL(/\/meeting\/.+/, { timeout: 15000 });
    const meetingUrl = pageA.url();
    
    // Alice will bypass the join prompt automatically because she just created it
    await expect(pageA.locator('button[title="Participants"]')).toBeVisible({ timeout: 10000 });

    // 4. Bob joins using Alice's meeting link (without the name query param)
    const baseMeetingUrl = meetingUrl.split('?')[0];
    await pageB.goto(baseMeetingUrl);

    // Bob sees the join prompt, enters his name, and joins
    await pageB.fill('input[placeholder="Enter your name"]', 'Bob');
    await pageB.click('button:has-text("Join Meeting")');

    // 5. Verify both are in the room
    await expect(pageB.locator('button[title="Participants"]')).toBeVisible({ timeout: 10000 });

    // 6. Test WebSocket Signaling / Chat
    await pageA.click('button[title="Show Chat"]');
    await pageA.fill('input[placeholder="Type a message..."]', 'Hello from Alice!');
    await pageA.click('button:has-text("Send")');

    // Bob should receive the chat instantly
    await pageB.click('button[title="Show Chat"]');
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
