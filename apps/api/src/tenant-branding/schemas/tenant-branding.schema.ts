import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantBrandingDocument = HydratedDocument<TenantBranding>;

@Schema({ collection: 'tenant_brandings', timestamps: true })
export class TenantBranding {
  @Prop({ required: true, unique: true, index: true })
  organizationId!: string;

  @Prop({ type: Object, default: {} })
  light!: Record<string, string>;

  @Prop({ type: Object, default: {} })
  dark!: Record<string, string>;
}

export const TenantBrandingSchema =
  SchemaFactory.createForClass(TenantBranding);
