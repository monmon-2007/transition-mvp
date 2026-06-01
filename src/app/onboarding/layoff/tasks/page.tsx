"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useDashboard } from "../shared/DashboardContext";
import type { Status, TimeBucket } from "../shared/types";
import { TaskCard } from "@/components/dashboard/TaskCard";
import CelebrationToast from "@/components/CelebrationToast";
import { getCelebration, type Celebration } from "@/lib/celebrations";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";

const TIME_BUCKETS: { id: TimeBucket; label: string; description: string; dot: string; border: string; badge: string }[] = [
  {
    id: "do-now",
    label: "Do This Now",
    description: "Time-sensitive and critical actions",
    dot: "bg-red-500",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 border border-red-200",
  },
  {
    id: "this-week",
    label: "This Week",
    description: "Important but not urgent",
    dot: "bg-violet-500",
    border: "border-l-violet-500",
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  {
    id: "when-ready",
    label: "When You're Ready",
    description: "Handle these at your own pace",
    dot: "bg-gray-400",
    border: "border-l-gray-300",
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
  },
];

function TasksPageContent() {
  const {
    tasks,
    setTasks,
    displayTasks,
    runway,
  } = useDashboard();

  const [showCompleted, setShowCompleted] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "", explanation: "", timeBucket: "this-week" as TimeBucket, priority: "medium" as "high" | "medium" | "low",
  });

  const bucketedTasks = useMemo(() => {
    const map = new Map<TimeBucket, typeof displayTasks>();
    TIME_BUCKETS.forEach((b) => map.set(b.id, []));
    displayTasks.forEach((t) => {
      const bucket = t.timeBucket || "when-ready";
      const arr = map.get(bucket);
      if (arr) arr.push(t);
      else map.get("when-ready")!.push(t);
    });
    return map;
  }, [displayTasks]);

  function updateTaskStatus(id: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (status === "Done") {
      const task = displayTasks.find((t) => t.id === id);
      setCelebration(getCelebration(task?.category));
    }
  }

  function addTaskNote(taskId: string, text: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const note = { id: `note-${Date.now()}`, text, timestamp: new Date().toISOString() };
        return { ...t, notes: [...(t.notes || []), note] };
      })
    );
  }

  const totalTasks = displayTasks.length;
  const doneTasks = displayTasks.filter((t) => t.status === "Done" || t.status === "Skipped").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/onboarding/layoff/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Your Action Plan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {doneTasks} of {totalTasks} tasks completed · Prioritized for your situation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            Show completed
          </label>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add task
          </button>
        </div>
      </div>

      {/* Add custom task form */}
      {showAddTask && (
        <div className="bg-white border border-violet-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Add Custom Task</h3>
            <button onClick={() => setShowAddTask(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <input
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="What do you need to do?"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            <textarea
              value={newTask.explanation}
              onChange={(e) => setNewTask({ ...newTask, explanation: e.target.value })}
              placeholder="Why is this important? (optional)"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newTask.timeBucket}
                onChange={(e) => setNewTask({ ...newTask, timeBucket: e.target.value as TimeBucket })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="do-now">Do This Now</option>
                <option value="this-week">This Week</option>
                <option value="when-ready">When Ready</option>
              </select>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!newTask.title.trim()) return;
                  const task = {
                    id: `custom-${Date.now()}`,
                    title: newTask.title,
                    explanation: newTask.explanation || "Custom task",
                    why: "You created this task.",
                    status: "Not started" as Status,
                    category: "custom",
                    priority: newTask.priority,
                    timeBucket: newTask.timeBucket,
                  };
                  setTasks((prev) => [...prev, task]);
                  setNewTask({ title: "", explanation: "", timeBucket: "this-week", priority: "medium" });
                  setShowAddTask(false);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Add task
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {TIME_BUCKETS.map((bucket) => {
        const tasks = bucketedTasks.get(bucket.id) || [];
        const visible = showCompleted
          ? tasks
          : tasks.filter((t) => t.status !== "Done" && t.status !== "Skipped");
        if (visible.length === 0) return null;
        const bucketDone = tasks.filter((t) => t.status === "Done").length;
        return (
          <div key={bucket.id} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${bucket.dot}`} />
                <h3 className="font-bold text-gray-900">{bucket.label}</h3>
                <span className="text-sm text-gray-400">— {bucket.description}</span>
              </div>
              <span className="text-xs font-medium text-gray-400">
                {bucketDone}/{tasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {visible.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  phaseConfig={bucket}
                  onStatusChange={(s) => updateTaskStatus(task.id, s)}
                  onAddNote={(note) => addTaskNote(task.id, note)}
                  onNavigate={() => {}}
                  runwayRiskLevel={runway?.riskLevel}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Celebration toast */}
      {celebration && (
        <CelebrationToast
          celebration={celebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
