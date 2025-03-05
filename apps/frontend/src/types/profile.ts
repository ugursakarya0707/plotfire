import { UserType } from './user';

export interface Profile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  userType: UserType;
  bio?: string;
  avatar?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  interests: string[];
  skills: string[];
  education: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateDto {
  id?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  interests?: string[];
  skills?: string[];
  education?: string[];
}
