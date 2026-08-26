/**
 * @playground {"title": "Greet Function", "category": "basics", "runnable": true}
 * A simple greeting function that returns a personalized message.
 */
export function greet(name) {
  return `Hello, ${name}! Welcome to devsetgo.`;
}

/**
 * @playground {"title": "Fibonacci", "category": "algorithms", "runnable": true, "expectedOutput": "55"}
 * Calculate the nth Fibonacci number using recursion.
 */
export function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

/**
 * A utility function that transforms data.
 * This one is NOT marked as @playground.
 */
export function transformData(input) {
  return input.map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now(),
  }));
}
