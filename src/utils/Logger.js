export class Logger {
  static info(message) {
    console.log(message);
  }

  static error(message, error = null) {
    console.error(message, error?.message || "");
  }

  static warn(message) {
    console.warn(message);
  }
}