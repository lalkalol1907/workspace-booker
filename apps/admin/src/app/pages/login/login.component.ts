import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { apiErrorMessage } from '../../core/error-messages';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required.bind(Validators),
        Validators.email.bind(Validators),
      ],
    ],
    password: ['', Validators.required.bind(Validators)],
  });

  submitting = false;

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting) {
      return;
    }
    this.submitting = true;
    try {
      await this.auth.login(this.form.getRawValue());
      const redirect =
        this.route.snapshot.queryParamMap.get('redirect') || '/tenants';
      await this.router.navigateByUrl(redirect);
    } catch (e: unknown) {
      this.toast.show(
        apiErrorMessage(e, 'Не удалось войти. Проверьте email и пароль.'),
        'error',
      );
    } finally {
      this.submitting = false;
    }
  }
}
