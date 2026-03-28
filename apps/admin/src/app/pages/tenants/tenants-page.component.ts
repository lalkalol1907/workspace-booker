import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from '../../core/error-messages';
import type { OrganizationSummary } from '../../core/models/types';
import { ToastService } from '../../core/toast.service';

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
