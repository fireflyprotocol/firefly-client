
  /**
   * Generates random number
   * @param multiplier number to multiply with random number generated
   * @returns random number
   */
   export const  generateRandomNumber = (multiplier: number) => {
    return Math.floor(
      (Date.now() + Math.random() + Math.random()) * multiplier
    );
  };
  