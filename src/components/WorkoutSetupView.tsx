import React, { useState } from 'react';
import { Workout, WorkoutExercise, Exercise } from '../types';
import { Plus, Trash2, Edit2, Check, X, Dumbbell, Clock, Hash, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface WorkoutSetupViewProps {
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  exercises: Exercise[];
  onAddWorkout: (name: string) => void;
  onUpdateWorkout: (id: string, name: string) => void;
  onDeleteWorkout: (id: string) => void;
  onAddExerciseToWorkout: (workoutId: string, payload: {
    exercise_id: string;
    series: number;
    repetitions: string;
    rest_time: string;
    weight: number;
  }) => void;
  onUpdateWorkoutExercise: (id: string, payload: Partial<WorkoutExercise>) => void;
  onDeleteWorkoutExercise: (id: string) => void;
}

export default function WorkoutSetupView({
  workouts,
  workoutExercises,
  exercises,
  onAddWorkout,
  onUpdateWorkout,
  onDeleteWorkout,
  onAddExerciseToWorkout,
  onUpdateWorkoutExercise,
  onDeleteWorkoutExercise,
}: WorkoutSetupViewProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingWorkoutName, setEditingWorkoutName] = useState('');

  // Add Exercise Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExerciseId, setNewExerciseId] = useState('');
  const [newSeries, setNewSeries] = useState(3);
  const [newReps, setNewReps] = useState('10 — 12');
  const [newRest, setNewRest] = useState('01:45');
  const [newWeight, setNewWeight] = useState(40);

  const handleCreateWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorkoutName.trim()) {
      onAddWorkout(newWorkoutName.trim());
      setNewWorkoutName('');
    }
  };

  const handleStartRename = (w: Workout) => {
    setEditingWorkoutId(w.id);
    setEditingWorkoutName(w.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingWorkoutName.trim()) {
      onUpdateWorkout(id, editingWorkoutName.trim());
      setEditingWorkoutId(null);
    }
  };

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkout && newExerciseId) {
      onAddExerciseToWorkout(selectedWorkout.id, {
        exercise_id: newExerciseId,
        series: newSeries,
        repetitions: newReps,
        rest_time: newRest,
        weight: newWeight,
      });
      // reset states
      setNewExerciseId('');
      setNewSeries(3);
      setNewReps('10 — 12');
      setNewRest('01:45');
      setNewWeight(40);
      setShowAddForm(false);
    }
  };

  // Filter exercises in the selected workout
  const currentWorkoutExercises = selectedWorkout
    ? workoutExercises.filter((we) => we.workout_id === selectedWorkout.id)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-lg"
    >
      {/* Title */}
      <section className="space-y-xs">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-extrabold tracking-tight text-white uppercase">
          Rotinas de Treino
        </h1>
        <p className="text-body-md text-on-surface-variant font-medium">
          Crie, personalize e gerencie os treinos e séries dos alunos.
        </p>
      </section>

      {!selectedWorkout ? (
        // --- WORKOUTS LIST ---
        <div className="space-y-md">
          {/* Create Workout Form */}
          <form onSubmit={handleCreateWorkout} className="flex gap-sm">
            <input
              type="text"
              value={newWorkoutName}
              onChange={(e) => setNewWorkoutName(e.target.value)}
              placeholder="Ex: Treino de Ombros / Push Day"
              className="flex-grow bg-[#0F1115] border border-white/10 hover:border-white/20 focus:border-primary-container rounded-xl px-4 py-3 text-white font-medium focus:outline-none transition-colors placeholder:text-on-surface-variant/40"
              required
            />
            <button
              type="submit"
              className="bg-primary-container text-on-primary h-12 w-12 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary-container/20"
            >
              <Plus className="w-6 h-6 stroke-[3px]" />
            </button>
          </form>

          {/* Workouts Grid */}
          <div className="space-y-sm">
            {workouts.map((workout) => {
              const count = workoutExercises.filter((we) => we.workout_id === workout.id).length;
              return (
                <div
                  key={workout.id}
                  className="glass-card rounded-3xl p-md flex items-center justify-between border border-white/5 hover:border-white/10 transition-all duration-300 group"
                >
                  <div className="flex-grow flex items-center gap-md">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container">
                      <Dumbbell className="w-5 h-5" />
                    </div>

                    {editingWorkoutId === workout.id ? (
                      <div className="flex items-center gap-xs">
                        <input
                          type="text"
                          value={editingWorkoutName}
                          onChange={(e) => setEditingWorkoutName(e.target.value)}
                          className="bg-[#131313] border border-primary-container rounded-lg px-2 py-1 text-white text-body-lg focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(workout.id)}
                          className="p-1.5 text-primary-container hover:bg-white/5 rounded-lg"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingWorkoutId(null)}
                          className="p-1.5 text-secondary-container hover:bg-white/5 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setSelectedWorkout(workout)}
                        className="cursor-pointer"
                      >
                        <h4 className="text-body-lg font-bold text-white group-hover:text-primary-container transition-colors">
                          {workout.name}
                        </h4>
                        <p className="text-xs text-on-surface-variant font-medium">
                          {count} {count === 1 ? 'exercício' : 'exercícios'} cadastrados
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-xs">
                    {editingWorkoutId !== workout.id && (
                      <>
                        <button
                          onClick={() => handleStartRename(workout)}
                          className="p-2 text-on-surface-variant hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                          title="Renomear"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => onDeleteWorkout(workout.id)}
                          className="p-2 text-on-surface-variant hover:text-red-500 rounded-lg hover:bg-white/5 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedWorkout(workout)}
                      className="p-2 text-on-surface-variant group-hover:translate-x-1 transition-transform"
                    >
                      <ChevronRight className="w-5 h-5 text-primary-container" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // --- SELECTED WORKOUT CUSTOMIZER ---
        <div className="space-y-md">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedWorkout(null)}
              className="flex items-center gap-2 text-primary-container font-bold hover:underline"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar aos Treinos
            </button>
            <span className="text-label-md text-primary-container bg-primary-container/10 border border-primary-container/25 px-3 py-1 rounded-full uppercase font-bold">
              Personalizando: {selectedWorkout.name}
            </span>
          </div>

          {/* Exercises List in current workout */}
          <div className="space-y-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-headline-md font-bold text-white tracking-tight">
                Lista de Exercícios
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary-container text-on-primary text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary-container/10"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? 'Cancelar' : 'Adicionar Exercício'}
              </button>
            </div>

            {/* Add Exercise Panel */}
            {showAddForm && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                onSubmit={handleAddExerciseSubmit}
                className="glass-panel p-md rounded-3xl border border-primary-container/20 space-y-md"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {/* Select exercise */}
                  <div className="space-y-xs">
                    <label className="text-label-md text-on-surface-variant font-bold uppercase">
                      Exercício da Biblioteca
                    </label>
                    <select
                      value={newExerciseId}
                      onChange={(e) => setNewExerciseId(e.target.value)}
                      required
                      className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-container focus:outline-none"
                    >
                      <option value="">Selecione um exercício...</option>
                      {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name_pt} ({ex.muscle_group})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Weight */}
                  <div className="space-y-xs">
                    <label className="text-label-md text-on-surface-variant font-bold uppercase">
                      Carga Inicial (kg)
                    </label>
                    <input
                      type="number"
                      value={newWeight}
                      onChange={(e) => setNewWeight(Number(e.target.value))}
                      required
                      min="0"
                      className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  {/* Series and Reps */}
                  <div className="grid grid-cols-2 gap-sm">
                    <div className="space-y-xs">
                      <label className="text-label-md text-on-surface-variant font-bold uppercase">
                        Séries
                      </label>
                      <input
                        type="number"
                        value={newSeries}
                        onChange={(e) => setNewSeries(Number(e.target.value))}
                        required
                        min="1"
                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-container focus:outline-none"
                      />
                    </div>
                    <div className="space-y-xs">
                      <label className="text-label-md text-on-surface-variant font-bold uppercase">
                        Repetições
                      </label>
                      <input
                        type="text"
                        value={newReps}
                        onChange={(e) => setNewReps(e.target.value)}
                        placeholder="Ex: 10 - 12 ou 8"
                        required
                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-container focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Rest Time */}
                  <div className="space-y-xs">
                    <label className="text-label-md text-on-surface-variant font-bold uppercase">
                      Tempo de Descanso
                    </label>
                    <input
                      type="text"
                      value={newRest}
                      onChange={(e) => setNewRest(e.target.value)}
                      placeholder="Ex: 01:45"
                      required
                      className="w-full bg-[#0F1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-container text-on-primary font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-primary-container/20"
                >
                  Adicionar ao Treino
                </button>
              </motion.form>
            )}

            {/* Render Workout Exercises */}
            {currentWorkoutExercises.length === 0 ? (
              <div className="glass-panel p-lg rounded-3xl text-center border-dashed border-white/5 space-y-sm">
                <Dumbbell className="w-8 h-8 text-on-surface-variant mx-auto opacity-40" />
                <p className="text-body-md text-on-surface-variant">
                  Nenhum exercício neste treino. Use o botão acima para adicionar.
                </p>
              </div>
            ) : (
              <div className="space-y-sm">
                {currentWorkoutExercises.map((we) => {
                  const exerciseDetails = exercises.find((ex) => ex.id === we.exercise_id);
                  if (!exerciseDetails) return null;

                  return (
                    <div
                      key={we.id}
                      className="glass-card rounded-3xl p-md flex flex-col md:flex-row md:items-center justify-between border-l-4 border-l-primary-container border-y border-r border-white/5 space-y-md md:space-y-0"
                    >
                      <div className="space-y-xs">
                        <h4 className="text-body-lg font-bold text-white">
                          {exerciseDetails.name_pt}
                        </h4>
                        <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">
                          Grupo: {exerciseDetails.muscle_group}
                        </p>
                      </div>

                      {/* Display / edit metrics inside card inline */}
                      <div className="flex flex-wrap gap-md items-center">
                        {/* Series adjustment */}
                        <div className="flex items-center gap-xs">
                          <Hash className="w-4 h-4 text-primary-container" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase">Séries</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  onUpdateWorkoutExercise(we.id, { series: Math.max(1, we.series - 1) })
                                }
                                className="w-5 h-5 bg-[#0A0B0D] text-white hover:bg-white/10 rounded font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="text-sm font-bold text-white w-4 text-center">
                                {we.series}
                              </span>
                              <button
                                onClick={() =>
                                  onUpdateWorkoutExercise(we.id, { series: we.series + 1 })
                                }
                                className="w-5 h-5 bg-[#0A0B0D] text-white hover:bg-white/10 rounded font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Reps */}
                        <div className="flex items-center gap-xs">
                          <Dumbbell className="w-4 h-4 text-primary-container" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase">Reps</span>
                            <input
                              type="text"
                              value={we.repetitions}
                              onChange={(e) =>
                                onUpdateWorkoutExercise(we.id, { repetitions: e.target.value })
                              }
                              className="w-16 bg-[#0A0B0D] border border-white/5 rounded px-1.5 py-0.5 text-xs text-white font-bold"
                            />
                          </div>
                        </div>

                        {/* Rest Time */}
                        <div className="flex items-center gap-xs">
                          <Clock className="w-4 h-4 text-primary-container" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase">Descanso</span>
                            <input
                              type="text"
                              value={we.rest_time}
                              onChange={(e) =>
                                onUpdateWorkoutExercise(we.id, { rest_time: e.target.value })
                              }
                              className="w-16 bg-[#0A0B0D] border border-white/5 rounded px-1.5 py-0.5 text-xs text-white font-bold"
                            />
                          </div>
                        </div>

                        {/* Weight */}
                        <div className="flex items-center gap-xs">
                          <span className="text-xs font-bold text-primary-container">KG</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase">Carga</span>
                            <input
                              type="number"
                              value={we.weight}
                              onChange={(e) =>
                                onUpdateWorkoutExercise(we.id, { weight: Number(e.target.value) })
                              }
                              className="w-16 bg-[#0A0B0D] border border-white/5 rounded px-1.5 py-0.5 text-xs text-white font-bold"
                            />
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => onDeleteWorkoutExercise(we.id)}
                          className="p-2 text-on-surface-variant hover:text-red-500 rounded-lg hover:bg-white/5 transition-colors md:ml-md"
                          title="Remover do Treino"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
