export type ContentKind = "anime" | "drama" | "web_series" | "movie";
export type PublicationStatus = "draft" | "published" | "archived";
export type AdminRole = "super_admin" | "admin";
export type LinkImportKind = "stream" | "download";
export type LinkImportStatus = "completed" | "partial" | "failed";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      content: Table<
        {
          id: string;
          slug: string;
          kind: ContentKind;
          title: string;
          synopsis: string | null;
          artwork_url: string | null;
          publication_status: PublicationStatus;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          kind: ContentKind;
          title: string;
          synopsis?: string | null;
          artwork_url?: string | null;
          publication_status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          slug?: string;
          kind?: ContentKind;
          title?: string;
          synopsis?: string | null;
          artwork_url?: string | null;
          publication_status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        }
      >;
      seasons: Table<
        {
          id: string;
          content_id: string;
          season_number: number;
          title: string | null;
          synopsis: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          content_id: string;
          season_number: number;
          title?: string | null;
          synopsis?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          content_id?: string;
          season_number?: number;
          title?: string | null;
          synopsis?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      episodes: Table<
        {
          id: string;
          season_id: string;
          episode_number: number;
          title: string;
          synopsis: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          season_id: string;
          episode_number: number;
          title: string;
          synopsis?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          season_id?: string;
          episode_number?: number;
          title?: string;
          synopsis?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      admin_memberships: Table<
        {
          user_id: string;
          role: AdminRole;
          permissions: Record<string, boolean>;
          created_by: string | null;
          created_at: string;
        },
        {
          user_id: string;
          role?: AdminRole;
          permissions?: Record<string, boolean>;
          created_by?: string | null;
          created_at?: string;
        },
        {
          user_id?: string;
          role?: AdminRole;
          permissions?: Record<string, boolean>;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      streaming_servers: Table<
        {
          id: string;
          name: string;
          hostname: string;
          enabled: boolean;
          protection_enabled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          hostname: string;
          enabled?: boolean;
          protection_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          name?: string;
          hostname?: string;
          enabled?: boolean;
          protection_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      download_providers: Table<
        {
          id: string;
          name: string;
          hostname: string;
          enabled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          hostname: string;
          enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          name?: string;
          hostname?: string;
          enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      streaming_sources: Table<
        {
          id: string;
          content_id: string | null;
          episode_id: string | null;
          server_id: string;
          embed_url: string;
          enabled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          content_id?: string | null;
          episode_id?: string | null;
          server_id: string;
          embed_url: string;
          enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          content_id?: string | null;
          episode_id?: string | null;
          server_id?: string;
          embed_url?: string;
          enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      download_sources: Table<
        {
          id: string;
          content_id: string | null;
          episode_id: string | null;
          provider_id: string;
          download_url: string;
          quality: string | null;
          audio_language: string | null;
          enabled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          content_id?: string | null;
          episode_id?: string | null;
          provider_id: string;
          download_url: string;
          quality?: string | null;
          audio_language?: string | null;
          enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          content_id?: string | null;
          episode_id?: string | null;
          provider_id?: string;
          download_url?: string;
          quality?: string | null;
          audio_language?: string | null;
          enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      import_history: Table<
        {
          id: string;
          actor_id: string;
          import_kind: LinkImportKind;
          status: LinkImportStatus;
          records_total: number;
          records_imported: number;
          records_skipped: number;
          records_failed: number;
          created_at: string;
        },
        {
          id?: string;
          actor_id: string;
          import_kind: LinkImportKind;
          status: LinkImportStatus;
          records_total: number;
          records_imported: number;
          records_skipped: number;
          records_failed: number;
          created_at?: string;
        },
        {
          id?: string;
          actor_id?: string;
          import_kind?: LinkImportKind;
          status?: LinkImportStatus;
          records_total?: number;
          records_imported?: number;
          records_skipped?: number;
          records_failed?: number;
          created_at?: string;
        }
      >;
    };
    Views: Record<never, never>;
    Enums: {
      content_kind: ContentKind;
      publication_status: PublicationStatus;
      admin_role: AdminRole;
      link_import_kind: LinkImportKind;
      link_import_status: LinkImportStatus;
    };
    Functions: {
      is_super_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      has_admin_permission: {
        Args: { permission_name: string };
        Returns: boolean;
      };
    };
    CompositeTypes: Record<never, never>;
  };
};