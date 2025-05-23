import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWaitlistSignupSchema, insertNewsletterSignupSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Waitlist signup endpoint
  app.post("/api/waitlist", async (req, res) => {
    try {
      const validatedData = insertWaitlistSignupSchema.parse(req.body);
      const signup = await storage.createWaitlistSignup(validatedData);
      res.json({ 
        success: true, 
        message: "Successfully joined waitlist!",
        id: signup.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid email format",
          errors: error.errors 
        });
      } else if (error instanceof Error && error.message === "Email already exists in waitlist") {
        res.status(409).json({ 
          success: false, 
          message: "You're already on our waitlist!" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to join waitlist" 
        });
      }
    }
  });

  // Newsletter signup endpoint
  app.post("/api/newsletter", async (req, res) => {
    try {
      const validatedData = insertNewsletterSignupSchema.parse(req.body);
      const signup = await storage.createNewsletterSignup(validatedData);
      res.json({ 
        success: true, 
        message: "Successfully subscribed to newsletter!",
        id: signup.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: "Invalid email format",
          errors: error.errors 
        });
      } else if (error instanceof Error && error.message === "Email already exists in newsletter") {
        res.status(409).json({ 
          success: false, 
          message: "You're already subscribed to our newsletter!" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to subscribe to newsletter" 
        });
      }
    }
  });

  // Get waitlist count (optional endpoint for admin/stats)
  app.get("/api/waitlist/count", async (req, res) => {
    try {
      const signups = await storage.getAllWaitlistSignups();
      res.json({ count: signups.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to get waitlist count" });
    }
  });

  // Get newsletter count (optional endpoint for admin/stats)
  app.get("/api/newsletter/count", async (req, res) => {
    try {
      const signups = await storage.getAllNewsletterSignups();
      res.json({ count: signups.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to get newsletter count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
