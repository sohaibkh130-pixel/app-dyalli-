import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Le prénom est requis."),
    lastName: z.string().trim().min(1, "Le nom est requis."),
    email: z.string().trim().email("Adresse e-mail invalide."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas." });

export const loginSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis.").max(200),
    description: z.string().max(2000).optional(),
    category: z.string().max(60).optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    start_at: z.string().datetime({ offset: true }),
    end_at: z.string().datetime({ offset: true }),
  })
  .refine((v) => new Date(v.end_at) > new Date(v.start_at), { path: ["end_at"], message: "L'heure de fin doit être après l'heure de début." });

export const transactionSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Le montant doit être positif."),
  currency: z.string().length(3).default("MAD"),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  category: z.string().trim().min(1, "La catégorie est requise.").max(60),
  description: z.string().max(500).optional(),
  idempotency_key: z.string().max(100).optional(),
});

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(120),
  currency: z.string().length(3).default("MAD"),
  target_amount: z.coerce.number().positive("La cible doit être positive."),
  starting_amount: z.coerce.number().min(0).default(0),
  deadline: z.string().optional(),
});

export const contributionSchema = z.object({
  savings_goal_id: z.string().uuid(),
  amount: z.coerce.number().refine((n) => n !== 0, "Le montant ne peut pas être nul."),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  idempotency_key: z.string().max(100).optional(),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(160),
  category: z.string().trim().min(1),
  target_value: z.coerce.number().positive("La cible doit être positive."),
  unit: z.string().trim().min(1),
  period: z.enum(["day", "week", "month", "year", "custom"]),
  calc_method: z.enum(["numeric", "count", "duration", "financial", "custom"]).default("numeric"),
  deadline: z.string().optional(),
});
