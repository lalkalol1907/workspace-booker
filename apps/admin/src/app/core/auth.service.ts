import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { MeResponse, TokenResponse } from './models/types';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<MeResponse | null>(null);
  readonly loading = signal(false);

  constructor(
    private readonly http: HttpClient,
    private readonly tokens: TokenStorageService,
  ) {}

  async bootstrap(): Promise<void> {
    const t = this.tokens.getToken();
    if (!t) {
      return;
    }
    this.loading.set(true);
    try {
      await this.fetchMe();
    } catch {
      this.tokens.setToken(null);
      this.user.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async fetchMe(): Promise<void> {
    const me = await firstValueFrom(this.http.get<MeResponse>('/auth/me'));
    if (me.role !== 'super_admin') {
      throw new Error('forbidden role');
    }
    this.user.set(me);
  }

  async login(payload: { email: string; password: string }): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>('/auth/platform/login', payload),
    );
    this.tokens.setToken(res.accessToken);
    await this.fetchMe();
  }

  logout(): void {
    this.tokens.setToken(null);
    this.user.set(null);
  }
}
