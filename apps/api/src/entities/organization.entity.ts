import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Location } from './location.entity';
import { OrganizationHost } from './organization-host.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  slug!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => OrganizationHost, (h) => h.organization)
  hosts!: OrganizationHost[];

  @OneToMany(() => User, (u) => u.organization)
  users!: User[];

  @OneToMany(() => Location, (l) => l.organization)
  locations!: Location[];
}
