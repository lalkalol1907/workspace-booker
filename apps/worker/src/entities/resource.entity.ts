import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResourceType } from '../common/enums/resource-type.enum';
import { Organization } from './organization.entity';
import { Location } from './location.entity';
import { Booking } from './booking.entity';

@Entity('resources')
@Index(['organizationId'])
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => Location, (l) => l.resources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: ResourceType })
  type!: ResourceType;

  @Column({ type: 'int', default: 1 })
  capacity!: number;

  @Column({ name: 'max_booking_minutes', type: 'int', nullable: true })
  maxBookingMinutes!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => Booking, (b) => b.resource)
  bookings!: Booking[];
}
