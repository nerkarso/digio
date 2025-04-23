async function tryCatch(promise) {
  try {
    const value = await promise;
    return [value, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
