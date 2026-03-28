import { Injectable } from '@angular/core';

const KEY = 'booker_platform_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(KEY);
  }

  setToken(token: string | null): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    if (token === null) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, token);
    }
  }
}
