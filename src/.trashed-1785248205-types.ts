export interface Movie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  time: string;
  quality: string;
  lang: string;
  type: string;
  status: string;
  content?: string;
  category?: { id: string; name: string; slug: string }[];
  country?: { id: string; name: string; slug: string }[];
  actor?: string[];
  director?: string[];
}

export interface Episode {
  server_name: string;
  server_data: {
    name: string;
    slug: string;
    filename: string;
    link_embed: string;
    link_m3u8: string;
  }[];
}

export interface APIResponse<T> {
  status: boolean;
  items: T[];
  pagination: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface MovieDetailResponse {
  status: boolean;
  movie: Movie;
  episodes: Episode[];
}

export interface HistoryItem {
  id: string;
  name: string;
  slug: string;
  thumb_url: string;
  episodeName: string;
  episodeSlug: string;
  time: number;
  duration: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  movieSlug: string;
  uid: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: number;
  likes: string[]; // array of uids who liked
  parentId?: string;      // id of parent comment (null = top-level)
  replyToUsername?: string; // username being replied to
  isAdminReply?: boolean;   // true nếu admin reply
}
