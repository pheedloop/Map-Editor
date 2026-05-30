import { useMemo } from "react";
import type { FloorPlanData } from "../../types";
import type { ExhibitorBooth, SessionLocation, MeetingRoom } from "../../viewer/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PlacedRecord<T> {
  record: T;
  isPlaced: boolean;
}

export interface RecordCounts {
  placed: number;
  unplaced: number;
}

export interface PlacementRecords {
  booths: PlacedRecord<ExhibitorBooth>[];
  sessions: PlacedRecord<SessionLocation>[];
  meetingRooms: PlacedRecord<MeetingRoom>[];
  boothCounts: RecordCounts;
  sessionCounts: RecordCounts;
  roomCounts: RecordCounts;
  /** All slugs/IDs that exist in the record pool — used to detect orphaned elements. */
  knownBoothSlugs: Set<string>;
  knownSessionIds: Set<string>;
  knownRoomIds: Set<string>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlacementRecords(
  data: FloorPlanData,
  boothRecords: ExhibitorBooth[],
  sessionRecords: SessionLocation[],
  meetingRoomRecords: MeetingRoom[],
): PlacementRecords {
  return useMemo(() => {
    const elements = data.elements;

    const placedBoothSlugs = new Set(
      elements
        .map((el) => el.properties.boothSlug)
        .filter((slug): slug is string => Boolean(slug))
    );

    const placedSessionIds = new Set(
      elements
        .map((el) => el.properties.sessionId)
        .filter((id): id is string => Boolean(id))
    );

    const placedRoomIds = new Set(
      elements
        .map((el) => el.properties.meetingRoomId)
        .filter((id): id is string => Boolean(id))
    );

    const booths: PlacedRecord<ExhibitorBooth>[] = boothRecords.map((record) => ({
      record,
      isPlaced: placedBoothSlugs.has(record.slug),
    }));

    const sessions: PlacedRecord<SessionLocation>[] = sessionRecords.map((record) => ({
      record,
      isPlaced: placedSessionIds.has(String(record.id)),
    }));

    const meetingRooms: PlacedRecord<MeetingRoom>[] = meetingRoomRecords.map((record) => ({
      record,
      isPlaced: placedRoomIds.has(String(record.id)),
    }));

    const countOf = (arr: PlacedRecord<unknown>[]): RecordCounts => ({
      placed:   arr.filter((r) =>  r.isPlaced).length,
      unplaced: arr.filter((r) => !r.isPlaced).length,
    });

    return {
      booths,
      sessions,
      meetingRooms,
      boothCounts:   countOf(booths),
      sessionCounts: countOf(sessions),
      roomCounts:    countOf(meetingRooms),
      knownBoothSlugs: new Set(boothRecords.map((r) => r.slug)),
      knownSessionIds: new Set(sessionRecords.map((r) => String(r.id))),
      knownRoomIds:    new Set(meetingRoomRecords.map((r) => String(r.id))),
    };
  }, [data.elements, boothRecords, sessionRecords, meetingRoomRecords]);
}
