import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined. AI Translation features will fallback to client simulation.");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Use JSON body parser
  app.use(express.json());

  // --- API Routes ---

  // Get User Profile
  app.get('/api/user', (req, res) => {
    try {
      res.json(db.getUserProfile());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update User Profile
  app.put('/api/user', (req, res) => {
    try {
      const updated = db.updateUserProfile(req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get all exercises
  app.get('/api/exercises', (req, res) => {
    try {
      res.json(db.getExercises());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create exercise manually
  app.post('/api/exercises', (req, res) => {
    try {
      const { name_pt, name_en, muscle_group, description_pt, description_en } = req.body;
      if (!name_pt || !muscle_group || !description_pt) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
      }
      const newEx = db.addExercise({
        name_pt,
        name_en: name_en || name_pt,
        muscle_group,
        description_pt,
        description_en: description_en || description_pt
      });
      res.status(201).json(newEx);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit exercise
  app.put('/api/exercises/:id', (req, res) => {
    try {
      const updated = db.updateExercise(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Exercício não encontrado." });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete exercise
  app.delete('/api/exercises/:id', (req, res) => {
    try {
      const success = db.deleteExercise(req.params.id);
      if (!success) return res.status(404).json({ error: "Exercício não encontrado." });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Import and Translate via Gemini AI API
  app.post('/api/exercises/translate-import', async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: "O texto bruto para tradução e importação não pode estar vazio." });
      }

      console.log(`Processing translation for input of length: ${rawText.length}`);

      let translatedExercises: any[] = [];

      if (ai) {
        const prompt = `Analise os seguintes exercícios em inglês (em formato de planilha, lista ou CSV) e traduza todos os campos para português brasileiro, padronizando os termos de musculação usados nas academias no Brasil (ex: 'Bench Press' -> 'Supino Reto', 'Squat' -> 'Agachamento com Barra', 'Deadlift' -> 'Levantamento Terra', 'Dumbbell Curl' -> 'Rosca Alternada com Halteres', 'Lat Pulldown' -> 'Puxada Alta', etc.).
Retorne um array JSON contendo objetos estruturados para cada exercício.

Texto a analisar:
${rawText}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "Você é um treinador de fisiculturismo sênior, fisiologista e tradutor profissional de educação física no Brasil. Traduza termos técnicos para a linguagem usual brasileira de academia com excelente detalhamento de segurança.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "Array de exercícios traduzidos",
              items: {
                type: Type.OBJECT,
                properties: {
                  name_pt: { type: Type.STRING, description: "Nome tradicional traduzido e adaptado para a linguagem de musculação brasileira (Ex: 'Supino Reto', 'Agachamento Livre')" },
                  name_en: { type: Type.STRING, description: "Nome original em inglês" },
                  muscle_group: { type: Type.STRING, description: "Grupo muscular principal ou secundários em português (Ex: 'Peito, Tríceps', 'Costas, Bíceps')" },
                  description_pt: { type: Type.STRING, description: "Instruções de execução correta e segurança traduzidas detalhadamente para português do Brasil" },
                  description_en: { type: Type.STRING, description: "Instruções originais em inglês" }
                },
                required: ["name_pt", "name_en", "muscle_group", "description_pt", "description_en"]
              }
            }
          }
        });

        const textOutput = response.text;
        if (textOutput) {
          translatedExercises = JSON.parse(textOutput.trim());
        }
      } else {
        // Fallback simulation if no API Key (safety guard)
        console.warn("API Key missing, running fallback simulation");
        const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);
        translatedExercises = lines.map((line: string) => {
          const parts = line.split('|').map((p: string) => p.trim());
          const nameEn = parts[0] || "Unknown Exercise";
          const muscleEn = parts[1] || "General";
          const descEn = parts[2] || "";

          // Simple dictionary maps
          let namePt = nameEn;
          let musclePt = muscleEn;
          if (nameEn.toLowerCase().includes("bench press")) namePt = "Supino Reto";
          else if (nameEn.toLowerCase().includes("squat")) namePt = "Agachamento com Barra";
          else if (nameEn.toLowerCase().includes("deadlift")) namePt = "Levantamento Terra";
          else if (nameEn.toLowerCase().includes("bicep curl")) namePt = "Rosca Direta";
          else if (nameEn.toLowerCase().includes("overhead press")) namePt = "Desenvolvimento Militar";

          if (muscleEn.toLowerCase() === "chest") musclePt = "Peito";
          else if (muscleEn.toLowerCase() === "legs") musclePt = "Quadríceps, Glúteos";
          else if (muscleEn.toLowerCase() === "back") musclePt = "Costas";
          else if (muscleEn.toLowerCase() === "shoulders") musclePt = "Ombros";
          else if (muscleEn.toLowerCase() === "arms") musclePt = "Braços";

          return {
            name_pt: namePt,
            name_en: nameEn,
            muscle_group: musclePt,
            description_pt: `[Traduzido] Execute este exercício para fortalecer os músculos de ${musclePt}. ` + (descEn ? `Descrição: ${descEn}` : "Mantenha a postura correta e o core ativado."),
            description_en: descEn || nameEn
          };
        });
      }

      // Save to database (descarta itens sem os campos mínimos vindos da IA)
      const imported: any[] = [];
      const validExercises = translatedExercises.filter(
        (ex) => ex && typeof ex.name_pt === 'string' && ex.name_pt.trim() && typeof ex.muscle_group === 'string'
      );
      for (const ex of validExercises) {
        const newEx = db.addExercise({
          name_pt: ex.name_pt,
          name_en: ex.name_en,
          muscle_group: ex.muscle_group,
          description_pt: ex.description_pt,
          description_en: ex.description_en
        });
        imported.push(newEx);
      }

      res.status(201).json({
        message: `${imported.length} exercícios importados e traduzidos com sucesso.`,
        importedCount: imported.length,
        exercises: imported
      });

    } catch (e: any) {
      console.error("Gemini Translation Error:", e);
      res.status(500).json({ error: "Falha ao traduzir e importar exercícios: " + e.message });
    }
  });

  // Get all workouts
  app.get('/api/workouts', (req, res) => {
    try {
      res.json(db.getWorkouts());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create workout
  app.post('/api/workouts', (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: "Nome do treino é obrigatório." });
      const newW = db.addWorkout(name);
      res.status(201).json(newW);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit workout name
  app.put('/api/workouts/:id', (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: "Nome do treino é obrigatório." });
      const updated = db.updateWorkout(req.params.id, name);
      if (!updated) return res.status(404).json({ error: "Treino não encontrado." });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete workout
  app.delete('/api/workouts/:id', (req, res) => {
    try {
      const success = db.deleteWorkout(req.params.id);
      if (!success) return res.status(404).json({ error: "Treino não encontrado." });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get all workout exercises globally
  app.get('/api/workout-exercises', (req, res) => {
    try {
      res.json(db.getWorkoutExercises());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get exercises for a specific workout
  app.get('/api/workouts/:id/exercises', (req, res) => {
    try {
      const list = db.getWorkoutExercisesForWorkout(req.params.id);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Add exercise to a workout
  app.post('/api/workouts/:id/exercises', (req, res) => {
    try {
      const { exercise_id, series, repetitions, rest_time, weight } = req.body;
      if (!exercise_id) return res.status(400).json({ error: "Id do exercício é obrigatório." });

      const newWe = db.addWorkoutExercise({
        workout_id: req.params.id,
        exercise_id,
        series: Number(series) || 3,
        repetitions: repetitions || "10 - 12",
        rest_time: rest_time || "01:30",
        weight: Number(weight) || 40
      });
      res.status(201).json(newWe);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit active workout exercise parameters
  app.put('/api/workout-exercises/:id', (req, res) => {
    try {
      const updated = db.updateWorkoutExercise(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Exercício do treino não encontrado." });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Remove exercise from workout
  app.delete('/api/workout-exercises/:id', (req, res) => {
    try {
      const success = db.deleteWorkoutExercise(req.params.id);
      if (!success) return res.status(404).json({ error: "Exercício do treino não encontrado." });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get workout history logs
  app.get('/api/logs', (req, res) => {
    try {
      res.json(db.getWorkoutLogs());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Submit new workout log
  app.post('/api/logs', (req, res) => {
    try {
      const { workout_id, workout_name, duration, calories, notes, date } = req.body;
      if (!workout_name || !duration) {
        return res.status(400).json({ error: "Nome do treino e duração são obrigatórios." });
      }

      const newLog = db.addWorkoutLog({
        user_id: "user-alex",
        workout_id: workout_id || "custom",
        workout_name,
        date: date || new Date().toISOString().slice(0, 10),
        duration: Number(duration),
        calories: Number(calories) || Math.round(Number(duration) * 7.5), // estimate calories if not provided
        notes: notes || ""
      });

      res.status(201).json(newLog);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- End API Routes ---

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kinetic Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();
