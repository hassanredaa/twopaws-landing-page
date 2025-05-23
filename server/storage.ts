import { 
  users, 
  waitlistSignups,
  newsletterSignups,
  type User, 
  type InsertUser,
  type WaitlistSignup,
  type InsertWaitlistSignup,
  type NewsletterSignup,
  type InsertNewsletterSignup
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Waitlist operations
  createWaitlistSignup(signup: InsertWaitlistSignup): Promise<WaitlistSignup>;
  getWaitlistSignupByEmail(email: string): Promise<WaitlistSignup | undefined>;
  getAllWaitlistSignups(): Promise<WaitlistSignup[]>;
  
  // Newsletter operations
  createNewsletterSignup(signup: InsertNewsletterSignup): Promise<NewsletterSignup>;
  getNewsletterSignupByEmail(email: string): Promise<NewsletterSignup | undefined>;
  getAllNewsletterSignups(): Promise<NewsletterSignup[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private waitlistSignups: Map<number, WaitlistSignup>;
  private newsletterSignups: Map<number, NewsletterSignup>;
  private currentUserId: number;
  private currentWaitlistId: number;
  private currentNewsletterId: number;

  constructor() {
    this.users = new Map();
    this.waitlistSignups = new Map();
    this.newsletterSignups = new Map();
    this.currentUserId = 1;
    this.currentWaitlistId = 1;
    this.currentNewsletterId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createWaitlistSignup(insertSignup: InsertWaitlistSignup): Promise<WaitlistSignup> {
    // Check if email already exists
    const existing = await this.getWaitlistSignupByEmail(insertSignup.email);
    if (existing) {
      throw new Error("Email already exists in waitlist");
    }

    const id = this.currentWaitlistId++;
    const signup: WaitlistSignup = { 
      ...insertSignup, 
      id,
      createdAt: new Date()
    };
    this.waitlistSignups.set(id, signup);
    return signup;
  }

  async getWaitlistSignupByEmail(email: string): Promise<WaitlistSignup | undefined> {
    return Array.from(this.waitlistSignups.values()).find(
      (signup) => signup.email === email,
    );
  }

  async getAllWaitlistSignups(): Promise<WaitlistSignup[]> {
    return Array.from(this.waitlistSignups.values());
  }

  async createNewsletterSignup(insertSignup: InsertNewsletterSignup): Promise<NewsletterSignup> {
    // Check if email already exists
    const existing = await this.getNewsletterSignupByEmail(insertSignup.email);
    if (existing) {
      throw new Error("Email already exists in newsletter");
    }

    const id = this.currentNewsletterId++;
    const signup: NewsletterSignup = { 
      ...insertSignup, 
      id,
      createdAt: new Date()
    };
    this.newsletterSignups.set(id, signup);
    return signup;
  }

  async getNewsletterSignupByEmail(email: string): Promise<NewsletterSignup | undefined> {
    return Array.from(this.newsletterSignups.values()).find(
      (signup) => signup.email === email,
    );
  }

  async getAllNewsletterSignups(): Promise<NewsletterSignup[]> {
    return Array.from(this.newsletterSignups.values());
  }
}

export const storage = new MemStorage();
