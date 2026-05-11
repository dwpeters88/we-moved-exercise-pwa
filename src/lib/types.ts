export type BuddyMember = {
  crew_id: string;
  user_id: string;
  display_name: string;
  /** Public Storage URL under bucket `exercise_buddy_avatars`. */
  avatar_url: string | null;
};

export type BuddyCompletion = {
  id: string;
  crew_id: string;
  user_id: string;
  completed_at: string;
  workout_day: string;
};
