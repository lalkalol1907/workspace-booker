import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/error-messages';
import type {
  OrganizationSummary,
  TenantBranding,
} from '../../core/models/types';
import { ToastService } from '../../core/toast.service';
import { hexToHslToken, hslTokenToHex } from './hsl-color.util';

type BrandingColorField =
  | 'lightPrimary'
  | 'lightBackground'
  | 'lightForeground'
  | 'darkPrimary'
  | 'darkBackground'
  | 'darkForeground';

function normalizeHostList(fields: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of fields) {
    const s = raw.trim();
    if (!s || seen.has(s)) {
      continue;
    }
    seen.add(s);
    out.push(s);
  }
  return out;
}

@Component({
  selector: 'app-tenants-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './tenants-page.component.html',
  styleUrl: './tenants-page.component.scss',
})
export class TenantsPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  rows: OrganizationSummary[] = [];
  loading = false;

  createOpen = false;
  creating = false;
  createName = '';
  createSlug = '';
  createHostFields: string[] = [''];

  editOpen = false;
  editName = '';
  editSlug = '';
  editId = '';
  editHostFields: string[] = [''];
  updatingId: string | null = null;

  brandingOpen = false;
  brandingOrgId = '';
  brandingOrgName = '';
  brandingSaving = false;
  brandingLoading = false;
  /** HSL-компоненты как в style.css, напр. 230 90% 64% */
  lightPrimary = '';
  lightBackground = '';
  lightForeground = '';
  darkPrimary = '';
  darkBackground = '';
  darkForeground = '';

  brandingHexPreview(key: BrandingColorField): string {
    return hslTokenToHex(this[key]);
  }

  onBrandingColorInput(key: BrandingColorField, ev: Event): void {
    this[key] = hexToHslToken((ev.target as HTMLInputElement).value);
  }

  ngOnInit(): void {
    void this.loadOrganizations();
  }

  async loadOrganizations(): Promise<void> {
    this.loading = true;
    try {
      this.rows = await firstValueFrom(
        this.http.get<OrganizationSummary[]>('/platform/organizations'),
      );
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось загрузить организации'),
        'error',
      );
    } finally {
      this.loading = false;
    }
  }

  addEditHostField(): void {
    this.editHostFields.push('');
  }

  removeEditHostField(index: number): void {
    if (this.editHostFields.length <= 1) {
      return;
    }
    this.editHostFields.splice(index, 1);
  }

  addCreateHostField(): void {
    this.createHostFields.push('');
  }

  removeCreateHostField(index: number): void {
    if (this.createHostFields.length <= 1) {
      return;
    }
    this.createHostFields.splice(index, 1);
  }

  openEdit(row: OrganizationSummary): void {
    this.editId = row.id;
    this.editName = row.name;
    this.editSlug = row.slug;
    this.editHostFields =
      row.hosts.length > 0 ? row.hosts.map((h) => h) : [''];
    this.editOpen = true;
  }

  openCreate(): void {
    this.createName = '';
    this.createSlug = '';
    this.createHostFields = [''];
    this.createOpen = true;
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  closeEdit(): void {
    this.editOpen = false;
  }

  openBranding(row: OrganizationSummary): void {
    this.brandingOrgId = row.id;
    this.brandingOrgName = row.name;
    this.brandingOpen = true;
    void this.loadBranding();
  }

  closeBranding(): void {
    this.brandingOpen = false;
  }

  async loadBranding(): Promise<void> {
    this.brandingLoading = true;
    this.lightPrimary = '';
    this.lightBackground = '';
    this.lightForeground = '';
    this.darkPrimary = '';
    this.darkBackground = '';
    this.darkForeground = '';
    try {
      const data = await firstValueFrom(
        this.http.get<TenantBranding>(
          `/platform/organizations/${this.brandingOrgId}/branding`,
        ),
      );
      const l = data.light ?? {};
      const d = data.dark ?? {};
      this.lightPrimary = l['primary'] ?? '';
      this.lightBackground = l['background'] ?? '';
      this.lightForeground = l['foreground'] ?? '';
      this.darkPrimary = d['primary'] ?? '';
      this.darkBackground = d['background'] ?? '';
      this.darkForeground = d['foreground'] ?? '';
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось загрузить брендинг'),
        'error',
      );
    } finally {
      this.brandingLoading = false;
    }
  }

  async saveBranding(): Promise<void> {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    if (this.lightPrimary.trim()) {
      light['primary'] = this.lightPrimary.trim();
    }
    if (this.lightBackground.trim()) {
      light['background'] = this.lightBackground.trim();
    }
    if (this.lightForeground.trim()) {
      light['foreground'] = this.lightForeground.trim();
    }
    if (this.darkPrimary.trim()) {
      dark['primary'] = this.darkPrimary.trim();
    }
    if (this.darkBackground.trim()) {
      dark['background'] = this.darkBackground.trim();
    }
    if (this.darkForeground.trim()) {
      dark['foreground'] = this.darkForeground.trim();
    }
    if (Object.keys(light).length === 0 && Object.keys(dark).length === 0) {
      this.toast.show('Укажите хотя бы одно значение цвета', 'error');
      return;
    }
    this.brandingSaving = true;
    try {
      const body: { light?: Record<string, string>; dark?: Record<string, string> } =
        {};
      if (Object.keys(light).length > 0) {
        body.light = light;
      }
      if (Object.keys(dark).length > 0) {
        body.dark = dark;
      }
      await firstValueFrom(
        this.http.patch<TenantBranding>(
          `/platform/organizations/${this.brandingOrgId}/branding`,
          body,
        ),
      );
      this.toast.show('Тема сохранена', 'success');
      this.closeBranding();
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось сохранить тему'),
        'error',
      );
    } finally {
      this.brandingSaving = false;
    }
  }

  async submitCreate(): Promise<void> {
    const hosts = normalizeHostList(this.createHostFields);
    if (!this.createName.trim() || !this.createSlug.trim() || hosts.length === 0) {
      this.toast.show('Заполните название, slug и хотя бы один домен', 'error');
      return;
    }
    this.creating = true;
    try {
      await firstValueFrom(
        this.http.post<OrganizationSummary>('/platform/organizations', {
          name: this.createName.trim(),
          slug: this.createSlug.trim().toLowerCase(),
          hosts,
        }),
      );
      this.toast.show('Организация создана', 'success');
      this.closeCreate();
      await this.loadOrganizations();
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось создать организацию'),
        'error',
      );
    } finally {
      this.creating = false;
    }
  }

  async submitEdit(): Promise<void> {
    const hosts = normalizeHostList(this.editHostFields);
    if (!this.editName.trim() || !this.editSlug.trim() || hosts.length === 0) {
      this.toast.show('Заполните название, slug и хотя бы один домен', 'error');
      return;
    }
    this.updatingId = this.editId;
    try {
      await firstValueFrom(
        this.http.patch<OrganizationSummary>(
          `/platform/organizations/${this.editId}`,
          {
            name: this.editName.trim(),
            slug: this.editSlug.trim().toLowerCase(),
            hosts,
          },
        ),
      );
      this.toast.show('Сохранено', 'success');
      this.closeEdit();
      await this.loadOrganizations();
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось сохранить организацию'),
        'error',
      );
    } finally {
      this.updatingId = null;
    }
  }
}
