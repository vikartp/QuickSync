import { test, expect } from '@playwright/test';

test.describe('QuickSync WebRTC P2P Tests', () => {
  test('Two users can join the same channel and connect', async ({ browser }) => {
    // Give extra headroom for WebRTC ICE negotiation on localhost
    test.setTimeout(90000);

    // 1. Create two separate browser contexts to simulate Alice and Bob
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const pageA = await userAContext.newPage();
    const pageB = await userBContext.newPage();

    // 2. Alice creates a guest meeting from the auth page
    await pageA.goto('/auth');
    // Wait for React hydration — the input must be interactive before we type
    await pageA.waitForLoadState('networkidle');
    // Use pressSequentially so each keystroke fires React's onChange handler
    await pageA.locator('input[placeholder="Your display name"]').pressSequentially('Alice');
    await pageA.click('button:has-text("Start Meeting")');

    // 3. Wait for Alice to be redirected to the meeting room
    await expect(pageA).toHaveURL(/\/meeting\/.+/, { timeout: 20000 });
    const meetingUrl = pageA.url();

    // Alice auto-joins because nameFromQuery is set — wait for the room controls
    await expect(pageA.locator('button[title="Participants"]')).toBeVisible({ timeout: 15000 });

    // 4. Bob joins using Alice's meeting link (no ?name param → triggers join prompt)
    const baseMeetingUrl = meetingUrl.split('?')[0];
    await pageB.goto(baseMeetingUrl);

    // Bob sees the join prompt, enters his name, and joins
    await pageB.fill('input[placeholder="Enter your name"]', 'Bob');
    await pageB.click('button:has-text("Join Meeting")');

    // 5. Verify Bob is in the room
    await expect(pageB.locator('button[title="Participants"]')).toBeVisible({ timeout: 15000 });

    // 6. Test WebSocket Signaling / Chat
    // Chat sidebar is visible by default; only click "Show Chat" if it was closed
    const showChatBtnA = pageA.locator('button[title="Show Chat"]');
    if (await showChatBtnA.isVisible({ timeout: 1000 }).catch(() => false)) {
      await showChatBtnA.click();
    }

    const chatInputA = pageA.locator('input[placeholder="Type a message..."]');
    await expect(chatInputA).toBeVisible({ timeout: 5000 });
    await chatInputA.fill('Hello from Alice!');

    // Submit via Enter (the chat form handles onSubmit)
    await chatInputA.press('Enter');

    // Bob opens chat if needed and checks for Alice's message
    const showChatBtnB = pageB.locator('button[title="Show Chat"]');
    if (await showChatBtnB.isVisible({ timeout: 1000 }).catch(() => false)) {
      await showChatBtnB.click();
    }

    await expect(pageB.locator('text=Hello from Alice!')).toBeVisible({ timeout: 15000 });

    // 7. Test WebRTC fake media: Alice turns on her camera
    await pageA.click('button[title="Start Camera"]');

    // Bob's UI should render Alice's incoming video stream.
    // Use :visible to match only video elements that are displayed (not display:none).
    // (--use-fake-device-for-media-stream provides a real fake stream for WebRTC)
    const bobRemoteVideo = pageB.locator('video:visible').first();
    await expect(bobRemoteVideo).toBeVisible({ timeout: 20000 });

    // Clean up
    await userAContext.close();
    await userBContext.close();
  });
});
