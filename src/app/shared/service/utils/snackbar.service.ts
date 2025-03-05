import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';


@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

  constructor(private snackBar: MatSnackBar) { }

  /**
   * Displays a snackbar that auto-closes after a given duration.
   * @param message The message to display
   * @param action The action button text (optional)
   * @param duration The duration before it auto-closes (in milliseconds)
   */
  showAutoClose(message: string, action: string = 'OK', duration: number = 3000): void {
    const config: MatSnackBarConfig = {
      duration: duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-auto']
    };
    this.snackBar.open(message, action, config);
  }

  /**
   * Displays a snackbar that remains open until the user clicks the button.
   * @param message The message to display
   * @param action The action button text
   */
  showManualClose(message: string, action: string = 'Close'): void {
    const config: MatSnackBarConfig = {
      duration: undefined, // Keeps it open until manually closed
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-manual']
    };
    this.snackBar.open(message, action, config);
  }

  /**
   * Displays an error message with a red background.
   * @param message The error message to display
   */
  showError(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error']
    };
    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Displays a success message with a green background.
   * @param message The success message to display
   */
  showSuccess(message: string): void {
    const config: MatSnackBarConfig = {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-success']
    };
    this.snackBar.open(message, 'OK', config);
  }
}
