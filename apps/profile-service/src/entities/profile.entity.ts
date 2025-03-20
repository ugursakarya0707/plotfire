import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserType } from '@postply/models';

@Entity('profiles')
export class ProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.STUDENT
  })
  userType: UserType;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  website: string;

  @Column('simple-array', { default: '' })
  interests: string[];

  @Column('simple-array', { default: '' })
  skills: string[];

  @Column('simple-array', { default: '' })
  education: string[];

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'float', nullable: true, default: 0 })
  hourlyRate: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  rating: number;

  @Column({ type: 'int', nullable: true, default: 0 })
  ratingCount: number;

  @Column({ nullable: true })
  photoUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
