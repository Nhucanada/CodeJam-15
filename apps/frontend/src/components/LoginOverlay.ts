import { authAPI } from '../api/client';

export class LoginOverlay {
private overlay: HTMLElement;
private isSignupMode: boolean = false;
private onAuthSuccess: () => void;

constructor(onAuthSuccess: () => void) {
    this.onAuthSuccess = onAuthSuccess;
    this.overlay = this.createOverlay();
    this.attachEventListeners();
}

private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = this.getOverlayHTML();
    return overlay;
}

private getOverlayHTML(): string {
    return `
    <div class="login-overlay-content">
        <div class="barline-title">B A R L I N E</div>
        <div class="barline-subtitle">A Digital Bar for Real Drinks</div>
        <div class="login-modal">
            <div class="login-content">
            <div class="login-header">
                <h1 class="login-title">${this.isSignupMode ? 'SIGN UP' : 'LOG IN'}</h1>
                <p class="login-subtitle">Access your cocktail collection</p>
            </div>
            
            <div class="error-message" id="error-message" style="display: none;"></div>
            <div class="success-message" id="success-message" style="display: none;"></div>
            
            <form class="login-form" id="auth-form">
                ${this.isSignupMode ? `
                <div class="form-group">
                    <label class="form-label">FULL NAME</label>
                    <input type="text" class="form-input" id="full-name" placeholder="Enter your full name" required>
                </div>
                ` : ''}
                
                <div class="form-group">
                <label class="form-label">${this.isSignupMode ? 'EMAIL' : 'USERNAME/EMAIL'}</label>
                <input type="email" class="form-input" id="email" placeholder="Enter your email" required>
                </div>
                
                <div class="form-group">
                <label class="form-label">PASSWORD</label>
                <input type="password" class="form-input" id="password" placeholder="Enter your password" required>
                </div>
                
                <div class="login-buttons">
                <button type="submit" class="login-btn" id="auth-btn">
                    ${this.isSignupMode ? 'SIGN UP' : 'LOG IN'}
                </button>
                </div>
            </form>
            
            <div class="toggle-mode">
                <span class="toggle-link" id="toggle-mode">
                ${this.isSignupMode ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </span>
            </div>
            </div>
        </div>
    </div>
    `;
}

private attachEventListeners(): void {
    // Form submission
    this.overlay.addEventListener('submit', this.handleSubmit.bind(this));

    // Toggle between signin/signup
    this.overlay.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'toggle-mode') {
        this.toggleMode();
    }
    });
}

private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const email = (form.querySelector('#email') as HTMLInputElement).value;
    const password = (form.querySelector('#password') as HTMLInputElement).value;
    const fullName = this.isSignupMode ? (form.querySelector('#full-name') as HTMLInputElement).value : '';

    const authBtn = form.querySelector('#auth-btn') as HTMLButtonElement;
    const errorEl = this.overlay.querySelector('#error-message') as HTMLElement;
    const successEl = this.overlay.querySelector('#success-message') as HTMLElement;

    // Clear previous messages
    this.hideMessage(errorEl);
    this.hideMessage(successEl);

    // Disable button and show loading
    authBtn.disabled = true;
    authBtn.textContent = this.isSignupMode ? 'SIGNING UP...' : 'SIGNING IN...';

    try {
    if (this.isSignupMode) {
        await authAPI.signup(email, password, fullName);
        this.showMessage(successEl, 'Registration successful! Please log in.');
        this.isSignupMode = false;
        this.refreshOverlay();
    } else {
        await authAPI.login(email, password);
        this.showMessage(successEl, 'Login successful!');

        // Wait a moment to show success, then hide overlay
        setTimeout(() => {
        this.hide();
        this.onAuthSuccess();
        }, 1000);
    }
    } catch (error) {
    let errorMessage = 'An error occurred. Please try again.';

    if (error instanceof Error) {
        if (error.message.includes('email')) {
        errorMessage = 'Invalid email address.';
        } else if (error.message.includes('password')) {
        errorMessage = 'Invalid password.';
        } else if (error.message.includes('already exists')) {
        errorMessage = 'An account with this email already exists.';
        } else if (error.message.includes('not found')) {
        errorMessage = 'Account not found. Please check your credentials.';
        } else {
        errorMessage = error.message;
        }
    }

    this.showMessage(errorEl, errorMessage);
    } finally {
    // Reset button
    authBtn.disabled = false;
    authBtn.textContent = this.isSignupMode ? 'SIGN UP' : 'SIGN IN';
    }
}

private toggleMode(): void {
    this.isSignupMode = !this.isSignupMode;
    this.refreshOverlay();
}

private refreshOverlay(): void {
    const parent = this.overlay.parentNode;
    if (parent) {
        // Remove old overlay
        parent.removeChild(this.overlay);
        // Create new overlay
        this.overlay = this.createOverlay();
        this.attachEventListeners();
        // Add new overlay to parent
        parent.appendChild(this.overlay);
    } else {
        // If not in DOM, just update innerHTML
        this.overlay.innerHTML = this.getOverlayHTML();
        this.attachEventListeners();
    }
}

private showMessage(element: HTMLElement, message: string): void {
    element.textContent = message;
    element.style.display = 'block';
}

private hideMessage(element: HTMLElement): void {
    element.style.display = 'none';
}

public show(): void {
    document.body.appendChild(this.overlay);
}

public hide(): void {
    if (this.overlay.parentNode) {
    this.overlay.parentNode.removeChild(this.overlay);
    }
}

public isVisible(): boolean {
    return this.overlay.parentNode !== null;
}
}