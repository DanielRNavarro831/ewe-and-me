/**
 * Daniel's notes and lines. He minds the shop while Madhu is away, and never
 * lectures: she knows more about fiber than he does, and he says so.
 */

/** Left on the counter after he's sold something while she was away. {n} = skeins sold. */
export const AWAY_NOTES_SOLD = [
  'Sold {n} while you were out! I told everyone you spun it yourself. They were very impressed. So am I.',
  'Minded the shop. Sold {n}. Someone asked me about micron counts and I just smiled and nodded.',
  '{n} sold! One lady wanted to know the WPI. I said "the good kind." Please don’t fire me.',
  'Sold {n}. I also re-folded the cubbies. Badly. Sorry. ♥',
];

/** When nothing sold (e.g. empty shelves). */
export const AWAY_NOTES_NONE = [
  'Shop was quiet. The shelves could use some of your yarn! Iroh supervised me the whole time.',
  'Nobody came in, so Mango and I practiced looking busy.',
  'No sales today. I think people are waiting for your next batch. I know I am.',
];

/** Short and sweet, for coming back after a little while. */
export const WELCOME_BACK = ['Welcome back!', 'There you are!', 'Hi love, welcome home.'];

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
