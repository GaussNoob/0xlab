import { notFound } from "next/navigation";
import { TrackDetail } from "@/components/learning/track-detail";
import { curriculumTracks, getCurriculumTrack } from "@/modules/learning/curriculum";

export function generateStaticParams() {
  return curriculumTracks.map((track) => ({ track: track.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }) {
  const { track: trackId } = await params;
  const track = getCurriculumTrack(trackId);
  return { title: track?.shortTitle ?? "Trilha" };
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: trackId } = await params;
  const track = getCurriculumTrack(trackId);
  if (!track) notFound();
  return <TrackDetail track={track} />;
}
