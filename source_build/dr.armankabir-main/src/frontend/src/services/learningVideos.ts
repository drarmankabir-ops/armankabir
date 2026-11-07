import { del, get, post } from "@/lib/apiClient";

export interface LearningVideo {
  id: number;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  access_type: "free" | "paid";
  price: number;
  currency: string;
  grant_type?: "purchase" | "classroom_enrollment" | "admin";
  seconds_watched?: number;
  completed_at?: string | null;
  last_accessed_at?: string | null;
}

export interface AdminLearningVideo extends LearningVideo {
  youtube_video_id: string;
  youtube_url: string;
  is_published: boolean | number;
}

export interface LearningVideoInput {
  title: string;
  description: string;
  category: string;
  youtube_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  access_type: "free" | "paid";
  price: number;
  currency: string;
  is_published: boolean;
}

export interface LearningVideoPlayback {
  id: number;
  title: string;
  description: string;
  youtube_video_id: string;
  thumbnail_url: string | null;
  duration_seconds: number;
}

export const learningVideoService = {
  async list(): Promise<LearningVideo[]> {
    const result = await get<{ videos: LearningVideo[] }>(
      "/learning-videos/list.php",
    );
    return result.videos;
  },

  async getPlayback(id: number): Promise<LearningVideoPlayback> {
    const result = await get<{ video: LearningVideoPlayback }>(
      "/learning-videos/access.php",
      { id },
    );
    return result.video;
  },

  async myVideos(): Promise<LearningVideo[]> {
    const result = await get<{ videos: LearningVideo[] }>(
      "/learning-videos/my-videos.php",
    );
    return result.videos;
  },

  async adminList(): Promise<AdminLearningVideo[]> {
    const result = await get<{ videos: AdminLearningVideo[] }>(
      "/learning-videos/admin-list.php",
    );
    return result.videos;
  },

  async save(video: LearningVideoInput & { id?: number }): Promise<number> {
    const result = await post<{ id: number }>(
      "/learning-videos/save.php",
      video,
    );
    return result.id;
  },

  async remove(id: number): Promise<void> {
    await post("/learning-videos/delete.php", { id });
  },
};
