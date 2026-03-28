import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/error-messages';
import type {
  PlatformAdminSummary,
  PlatformAdminUpsertResult,
} from '../../core/models/types';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-platform-admins-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './platform-admins-page.component.html',
  styleUrl: './platform-admins-page.component.scss',
})
export class PlatformAdminsPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  admins: PlatformAdminSummary[] = [];
  adminsLoading = false;
  adminSaving = false;
  adminEmail = '';
  adminDisplayName = '';
  adminResult: PlatformAdminUpsertResult | null = null;

  ngOnInit(): void {
    void this.loadAdmins();
  }

  async loadAdmins(): Promise<void> {
    this.adminsLoading = true;
    try {
      this.admins = await firstValueFrom(
        this.http.get<PlatformAdminSummary[]>('/platform/admins'),
      );
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось загрузить админов платформы'),
        'error',
      );
    } finally {
      this.adminsLoading = false;
    }
  }

  async submitPlatformAdmin(): Promise<void> {
    const email = this.adminEmail.trim();
    if (!email) {
      this.toast.show('Укажите email', 'error');
      return;
    }
    this.adminSaving = true;
    try {
      this.adminResult = await firstValueFrom(
        this.http.post<PlatformAdminUpsertResult>('/platform/admins', {
          email,
          displayName: this.adminDisplayName.trim() || undefined,
        }),
      );
      this.adminEmail = '';
      this.adminDisplayName = '';
      const a = this.adminResult.action;
      if (a === 'created') {
        this.toast.show('Админ платформы создан', 'success');
      } else if (a === 'promoted') {
        this.toast.show('Пользователь повышен до админа платформы', 'success');
      } else {
        this.toast.show('Пользователь уже является админом платформы', 'info');
      }
      await this.loadAdmins();
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось назначить админа платформы'),
        'error',
      );
    } finally {
      this.adminSaving = false;
    }
  }
}
