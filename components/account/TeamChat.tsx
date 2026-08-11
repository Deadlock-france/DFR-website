"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { buttonVariants } from "@/components/shadcn/button";
import { createClient } from "@/lib/supabase/client";
import type { TeamMessageWithAuthor } from "@/lib/account/types";
import { profileDisplayName } from "@/lib/account/types";
import { cn } from "@/lib/utils";

export default function TeamChat({
  teamId,
  userId,
  initialMessages,
}: {
  teamId: string;
  userId: string;
  initialMessages: TeamMessageWithAuthor[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`team-chat:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            team_id: string;
            author_id: string;
            body: string;
            created_at: string;
          };

          if (messages.some((m) => m.id === row.id)) return;

          const { data: author } = await supabase
            .from("profiles")
            .select("id, display_name, global_name, username, avatar_url")
            .eq("id", row.author_id)
            .maybeSingle();

          if (!author) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                team_id: row.team_id,
                author_id: row.author_id,
                body: row.body,
                created_at: row.created_at,
                author,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // messages volontairement hors deps : on déduplique à l'insertion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("team_messages").insert({
      team_id: teamId,
      author_id: userId,
      body: trimmed,
    });

    setSending(false);

    if (insertError) {
      setError("Impossible d'envoyer le message.");
      return;
    }

    setBody("");
  }

  return (
    <div
      className="flex flex-col rounded-2xl border"
      style={{ borderColor: "#1f2937" }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: "#1f2937" }}>
        <h2 className="text-base font-semibold">Chat d&apos;équipe</h2>
        <p className="text-xs text-muted-foreground">Temps réel — membres uniquement</p>
      </div>

      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun message pour l&apos;instant. Lance la discussion.
          </p>
        ) : (
          messages.map((message) => {
            const label = profileDisplayName(message.author);
            const mine = message.author_id === userId;
            return (
              <div
                key={message.id}
                className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}
              >
                {!mine ? (
                  <Avatar size="sm" className="rounded-lg">
                    {message.author.avatar_url ? (
                      <AvatarImage src={message.author.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="rounded-lg text-[0.6rem]">
                      {label.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <div
                  className="max-w-[80%] rounded-xl px-3 py-2"
                  style={{
                    backgroundColor: mine
                      ? "rgba(74, 155, 127, 0.18)"
                      : "rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {!mine ? (
                    <p className="mb-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                      {label}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {message.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t p-3"
        style={{ borderColor: "#1f2937" }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder="Écrire un message…"
          className="h-10 min-w-0 flex-1 rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ borderColor: "#1f2937" }}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className={cn(
            buttonVariants({ size: "default" }),
            "border-0 font-semibold text-white disabled:opacity-50",
          )}
          style={{ backgroundColor: "#4A9B7F" }}
        >
          Envoyer
        </button>
      </form>
      {error ? (
        <p className="px-3 pb-3 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
