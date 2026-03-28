import { HttpInterceptorFn } from '@angular/common/http';

export const apiPrefixInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('http')) {
    return next(req);
  }
  const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
  return next(req.clone({ url: `/api${path}` }));
};
