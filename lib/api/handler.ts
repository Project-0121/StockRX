import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { Profile, UserRole } from "@/types/database";

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  } | null;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiHandlerContext {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  params: Record<string, string | string[]>;
}

export interface WithApiOptions {
  roles?: UserRole[];
  bypassAuth?: boolean;
}

export function sanitizeSearchParam(input: string): string {
  // Strip , ( ) and escape % and _
  return input
    .replace(/[,()]/g, "")
    .replace(/[%_]/g, "\\$&")
    .trim();
}

export function withApi<T = unknown>(
  handler: (
    req: NextRequest,
    context: ApiHandlerContext
  ) => Promise<NextResponse<ApiResponse<T>> | Response>,
  options: WithApiOptions = {}
) {
  return async (
    req: NextRequest,
    routeProps: { params?: Record<string, string | string[]> } = {}
  ): Promise<Response> => {
    try {
      let user = { id: "", email: "" };
      let profile: Profile = {
        id: "",
        full_name: "",
        email: null,
        role: "staff",
        is_active: true,
        created_at: "",
        updated_at: "",
      };

      if (!options.bypassAuth) {
        const supabase = createClient();
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          return NextResponse.json<ApiResponse<T>>(
            {
              data: null,
              error: {
                code: "UNAUTHORIZED",
                message: "Authentication required. Please log in.",
              },
            },
            { status: 401 }
          );
        }

        user = {
          id: authUser.id,
          email: authUser.email || "",
        };

        // Load profile using admin client to guarantee retrieval
        const admin = getAdminClient();
        const { data: profileData, error: profileError } = await admin
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          return NextResponse.json<ApiResponse<T>>(
            {
              data: null,
              error: {
                code: "FORBIDDEN",
                message: "User profile not found.",
              },
            },
            { status: 403 }
          );
        }

        profile = profileData as Profile;

        if (!profile.is_active) {
          return NextResponse.json<ApiResponse<T>>(
            {
              data: null,
              error: {
                code: "FORBIDDEN",
                message: "Account has been deactivated. Please contact an administrator.",
              },
            },
            { status: 403 }
          );
        }

        if (options.roles && !options.roles.includes(profile.role)) {
          return NextResponse.json<ApiResponse<T>>(
            {
              data: null,
              error: {
                code: "FORBIDDEN",
                message: "You do not have permission to perform this action.",
              },
            },
            { status: 403 }
          );
        }
      }

      const params = routeProps.params || {};
      return await handler(req, { user, profile, params });
    } catch (err: unknown) {
      console.error("[API Error Handler]", err);

      if (err instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join(".") || "root";
          if (!fields[path]) {
            fields[path] = [];
          }
          fields[path].push(issue.message);
        }

        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request payload or query parameters.",
              fields,
            },
          },
          { status: 400 }
        );
      }

      // Check for Postgres or RPC exceptions
      const errorObj = err as { code?: string; message?: string; details?: string };
      const message = errorObj?.message || "";
      const pgCode = errorObj?.code || "";

      // Custom business exceptions raised by SQL functions
      if (message.includes("INSUFFICIENT_STOCK:")) {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "INSUFFICIENT_STOCK",
              message: message.replace(/^.*INSUFFICIENT_STOCK:\s*/, ""),
            },
          },
          { status: 409 }
        );
      }

      if (message.includes("BATCH_EXPIRY_MISMATCH:")) {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "BATCH_EXPIRY_MISMATCH",
              message: message.replace(/^.*BATCH_EXPIRY_MISMATCH:\s*/, ""),
            },
          },
          { status: 409 }
        );
      }

      if (message.includes("NOT_EXPIRED")) {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "NOT_EXPIRED",
              message: "Cannot write off a batch that is not expired.",
            },
          },
          { status: 409 }
        );
      }

      if (message.includes("NOTHING_TO_WRITE_OFF")) {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "NOTHING_TO_WRITE_OFF",
              message: "This batch has 0 quantity available to write off.",
            },
          },
          { status: 409 }
        );
      }

      if (message.includes("NO_CHANGE")) {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "NO_CHANGE",
              message: "The new quantity is identical to current quantity.",
            },
          },
          { status: 409 }
        );
      }

      if (message.includes("INVALID_EXPIRY")) {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "INVALID_EXPIRY",
              message: "Expiry date must be in the future.",
            },
          },
          { status: 400 }
        );
      }

      // Postgres Error Codes
      if (pgCode === "23505") {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "DUPLICATE_ENTRY",
              message: "A record with this identifier or unique combination already exists.",
            },
          },
          { status: 409 }
        );
      }

      if (pgCode === "23503") {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "FOREIGN_KEY_VIOLATION",
              message: "This record is referenced by other items or contains an invalid reference.",
            },
          },
          { status: 409 }
        );
      }

      if (pgCode === "23514") {
        return NextResponse.json<ApiResponse<T>>(
          {
            data: null,
            error: {
              code: "CHECK_VIOLATION",
              message: "Value violates database constraints or check rules.",
            },
          },
          { status: 400 }
        );
      }

      // Generic internal error
      return NextResponse.json<ApiResponse<T>>(
        {
          data: null,
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred. Please try again later.",
          },
        },
        { status: 500 }
      );
    }
  };
}

export function jsonSuccess<T>(
  data: T,
  meta?: ApiResponse<T>["meta"],
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(
    {
      data,
      error: null,
      meta,
    },
    { status }
  );
}

export function jsonError(
  message: string,
  code = "BAD_REQUEST",
  status = 400,
  fields?: Record<string, string[]>
): NextResponse<ApiResponse<null>> {
  return NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error: {
        code,
        message,
        fields,
      },
    },
    { status }
  );
}
