// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users = /* @__PURE__ */ new Map();
  projects = /* @__PURE__ */ new Map();
  payments = /* @__PURE__ */ new Map();
  currentUserId = 1;
  currentProjectId = 1;
  currentPaymentId = 1;
  constructor() {
    this.users.set(1, {
      id: 1,
      username: "admin",
      email: "admin@bothost.pro",
      telegramUsername: "Rafi_00019",
      planType: "pro",
      isAdmin: true
    });
    this.currentUserId = 2;
  }
  // Users
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      telegramUsername: insertUser.telegramUsername || null,
      planType: insertUser.planType || "none",
      isAdmin: insertUser.isAdmin || false
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return void 0;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  // Projects
  async getProject(id) {
    return this.projects.get(id);
  }
  async getProjectsByUserId(userId) {
    return Array.from(this.projects.values()).filter((project) => project.userId === userId);
  }
  async createProject(insertProject) {
    const id = this.currentProjectId++;
    const project = {
      ...insertProject,
      id,
      status: insertProject.status || "offline",
      framework: insertProject.framework || null,
      repositoryUrl: insertProject.repositoryUrl || null,
      deploymentUrl: insertProject.deploymentUrl || null,
      lastDeployed: null,
      buildLogs: insertProject.buildLogs || null,
      environmentVariables: insertProject.environmentVariables || null,
      customDomain: insertProject.customDomain || null,
      isPublic: insertProject.isPublic ?? true,
      resourceUsage: insertProject.resourceUsage || null
    };
    this.projects.set(id, project);
    return project;
  }
  async updateProject(id, updates) {
    const project = this.projects.get(id);
    if (!project) return void 0;
    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }
  async deleteProject(id) {
    return this.projects.delete(id);
  }
  async getAllProjects() {
    return Array.from(this.projects.values());
  }
  // Payments
  async getPayment(id) {
    return this.payments.get(id);
  }
  async getPaymentsByUserId(userId) {
    return Array.from(this.payments.values()).filter((payment) => payment.userId === userId);
  }
  async createPayment(insertPayment) {
    const id = this.currentPaymentId++;
    const payment = {
      ...insertPayment,
      id,
      status: insertPayment.status || "pending",
      screenshotUrl: insertPayment.screenshotUrl || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }
  async updatePayment(id, updates) {
    const payment = this.payments.get(id);
    if (!payment) return void 0;
    const updated = { ...payment, ...updates };
    this.payments.set(id, updated);
    return updated;
  }
  async getPendingPayments() {
    return Array.from(this.payments.values()).filter((payment) => payment.status === "pending");
  }
  async getAllPayments() {
    return Array.from(this.payments.values());
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  telegramUsername: text("telegram_username"),
  planType: text("plan_type").notNull().default("none"),
  // "none", "basic", "pro"
  isAdmin: boolean("is_admin").notNull().default(false)
});
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  language: text("language").notNull(),
  // "nodejs", "python", "php", "html", "go", "rust", "java"
  framework: text("framework"),
  // "express", "fastapi", "laravel", "react", "vue", etc.
  repositoryUrl: text("repository_url"),
  deploymentUrl: text("deployment_url"),
  status: text("status").notNull().default("offline"),
  // "online", "offline", "building", "error"
  lastDeployed: timestamp("last_deployed"),
  buildLogs: text("build_logs"),
  environmentVariables: text("environment_variables"),
  // JSON string of env vars
  customDomain: text("custom_domain"),
  isPublic: boolean("is_public").default(true),
  resourceUsage: text("resource_usage")
  // JSON string with CPU, memory, bandwidth usage
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planType: text("plan_type").notNull(),
  // "basic", "pro"
  amount: integer("amount").notNull(),
  // in cents
  paymentMethod: text("payment_method").notNull(),
  // "binance", "bkash", "nagad"
  screenshotUrl: text("screenshot_url"),
  status: text("status").notNull().default("pending"),
  // "pending", "approved", "rejected"
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true
});
var insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  lastDeployed: true
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
});

// server/routes.ts
import multer from "multer";
var upload = multer({ dest: "uploads/" });
async function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/projects", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
      if (userId) {
        const projects2 = await storage.getProjectsByUserId(userId);
        res.json(projects2);
      } else {
        const projects2 = await storage.getAllProjects();
        res.json(projects2);
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const user = await storage.getUser(projectData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const userProjects = await storage.getProjectsByUserId(projectData.userId);
      const maxProjects = user.planType === "basic" ? 1 : user.planType === "pro" ? 4 : 0;
      if (userProjects.length >= maxProjects) {
        return res.status(400).json({ message: `Plan limit exceeded. ${user.planType} plan allows ${maxProjects} project(s)` });
      }
      const project = await storage.createProject({
        ...projectData,
        status: "building",
        deploymentUrl: `https://${projectData.name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 8)}.replit.app`,
        buildLogs: `Building ${projectData.language} project...
Installing dependencies...
Starting application...
Deployment successful!`,
        resourceUsage: JSON.stringify({
          cpu: Math.floor(Math.random() * 30) + 10,
          memory: Math.floor(Math.random() * 512) + 128,
          bandwidth: Math.floor(Math.random() * 1e3) + 100
        })
      });
      setTimeout(async () => {
        await storage.updateProject(project.id, { status: "online" });
      }, 2e3);
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/projects/:id/deploy", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      await storage.updateProject(id, {
        status: "building",
        buildLogs: `Starting deployment...
Pulling latest code...
Installing dependencies...
Building application...`,
        lastDeployed: /* @__PURE__ */ new Date()
      });
      setTimeout(async () => {
        await storage.updateProject(id, {
          status: "online",
          buildLogs: `Starting deployment...
Pulling latest code...
Installing dependencies...
Building application...
Deployment successful!
Application is now live at ${project.deploymentUrl}`
        });
      }, 3e3);
      res.json({ message: "Deployment started" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/payments", upload.single("screenshot"), async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        amount: parseInt(req.body.amount),
        userId: parseInt(req.body.userId)
      });
      if (req.file) {
        paymentData.screenshotUrl = `/uploads/${req.file.filename}`;
      }
      const payment = await storage.createPayment(paymentData);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/payments", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
      const status = req.query.status;
      if (userId) {
        const payments2 = await storage.getPaymentsByUserId(userId);
        res.json(payments2);
      } else if (status === "pending") {
        const payments2 = await storage.getPendingPayments();
        res.json(payments2);
      } else {
        const payments2 = await storage.getAllPayments();
        res.json(payments2);
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.patch("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const payment = await storage.updatePayment(id, updates);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (updates.status === "approved") {
        await storage.updateUser(payment.userId, { planType: payment.planType });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/stats", async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const projects2 = await storage.getAllProjects();
      const payments2 = await storage.getAllPayments();
      const stats = {
        totalUsers: users2.length,
        activeProjects: projects2.filter((project) => project.status === "online").length,
        pendingPayments: payments2.filter((payment) => payment.status === "pending").length,
        revenue: payments2.filter((payment) => payment.status === "approved").reduce((sum, payment) => sum + payment.amount, 0) / 100
        // Convert cents to dollars
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.use("/uploads", (req, res, next) => {
    res.status(200).json({ message: "File access would be implemented with proper file storage" });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
