export interface TasksApiResponse {
  id: number;
  userId: string;
  tasksJson: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch the current user's tasks from the backend.
 * User identity is determined server-side from the NextAuth session.
 */
export async function fetchTasks<T>(): Promise<T[] | null> {
  try {
    const response = await fetch("/api/tasks", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (response.status === 401) {
      throw new Error("Please log in to access your tasks");
    }

    if (response.status === 500 || response.status === 502) {
      console.warn("Backend unavailable, treating as no tasks");
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    const data: TasksApiResponse = await response.json();
    return JSON.parse(data.tasksJson) as T[];
  } catch (error: any) {
    console.error("Error fetching tasks:", error.message);
    throw error;
  }
}

/**
 * Save the current user's tasks to the backend.
 * User identity is determined server-side from the NextAuth session.
 */
export async function saveTasks<T>(tasks: T[]): Promise<void> {
  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasksJson: JSON.stringify(tasks) }),
    });

    if (response.status === 401) {
      throw new Error("Please log in to save your tasks");
    }

    if (!response.ok) {
      throw new Error(`Failed to save tasks: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error("Error saving tasks:", error.message);
    throw error;
  }
}
