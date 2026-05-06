const messages = {
  DREDD: {
    ahead_50:     ["That ghost is not even fast. Go prove it.", "You're ahead. Don't get comfortable."],
    ahead_100:    ["10 meters. Don't waste it.", "Keep the gap. No mercy."],
    ahead_200:    ["Ghost is dust. Finish it.", "20 meters. You own this run."],
    behind_50:    ["You call that chasing? Pick it up.", "5 meters behind. Embarrassing. Move."],
    behind_100:   ["Ghost is pulling away. Wake up.", "10 meters. That's not a gap, that's a statement."],
    behind_200:   ["Ghost is gone. Unless you do something NOW.", "20 meters down. You still have legs, use them."],
    closing_gap:  ["Better. Now don't waste it.", "Gap closing. Keep that energy."],
    gap_widening: ["You're slowing down. I can see it.", "Gap growing. That's on you."],
    new_lead:     ["There it is. You took the lead. HOLD IT.", "Finally. Now don't blow it."],
    lost_lead:    ["You had it. You lost it. Unacceptable.", "Ghost took the lead back. Fix that."],
    distance_500m:["50 meters. You're just warming up.", "First checkpoint. Ghost is watching."],
    distance_1km: ["100 meters done. Ghost isn't impressed yet.", "Second checkpoint. Keep the pressure."],
    distance_2km: ["200 meters. You're still here. Good.", "Third checkpoint. Don't fade now."],
    time_5min:    ["30 seconds. Ghost has been running longer. Catch up.", "30 sec in. Pace check - is that all you've got?"],
    time_10min:   ["60 seconds. You better be hurting.", "1 minute. This is where weak runners quit."],
  },
  KIRA: {
    ahead_50:     ["Breathe in. Stay light. You're closing the gap.", "You're ahead. Let the rhythm carry you."],
    ahead_100:    ["10 meters of space. Breathe and hold.", "The gap is yours. Stay present."],
    ahead_200:    ["20 meters. You found your flow.", "Deep breath. You are in control."],
    behind_50:    ["No panic. Small steps, steady pace.", "The ghost is close. Breathe through it."],
    behind_100:   ["Let the rhythm carry you forward.", "10 meters. One breath at a time."],
    behind_200:   ["The ghost runs ahead. You run your own race.", "20 meters. Release the tension. Find your stride."],
    closing_gap:  ["You're closing in. Stay soft, stay steady.", "The gap shrinks. Trust your body."],
    gap_widening: ["The gap grows. Return to your breath.", "Slow down inside. Speed up outside."],
    new_lead:     ["You've taken the lead. Stay grounded.", "The lead is yours. Breathe and hold it."],
    lost_lead:    ["The ghost leads now. That's okay. Recenter.", "Lost the lead. Breathe. Find your pace again."],
    distance_500m:["50 meters. Your body knows the way.", "First checkpoint. Stay in the moment."],
    distance_1km: ["100 meters. You are exactly where you need to be.", "Second checkpoint. Breathe. You're doing well."],
    distance_2km: ["200 meters. Your stride is your meditation.", "Third checkpoint. Stay light. Stay present."],
    time_5min:    ["30 seconds of movement. Honor that.", "30 sec. Your breath is the metronome."],
    time_10min:   ["60 seconds. You've found your rhythm.", "1 minute. Let your legs follow your breath."],
  },
  TITAN: {
    ahead_50:     ["Push now. This is where you take control.", "You're ahead. Don't let the ghost breathe."],
    ahead_100:    ["10 meters! You're stronger than this pace.", "Gap is 10. EXTEND IT."],
    ahead_200:    ["20 meters ahead! You're dominating this run!", "BEAST MODE. 20 meters. Keep going!"],
    behind_50:    ["Break the gap. Own the run.", "5 meters? That's nothing. CHARGE."],
    behind_100:   ["10 meters behind. Time to unleash.", "Ghost is ahead. You're stronger. PROVE IT."],
    behind_200:   ["20 meters. This is your comeback moment. GO.", "Ghost thinks it won. Show it otherwise. NOW."],
    closing_gap:  ["YES! Gap closing! MORE!", "That's the energy! Keep attacking!"],
    gap_widening: ["Gap growing. Dig deeper. You have more.", "Don't let the ghost escape. PUSH."],
    new_lead:     ["YOU TOOK THE LEAD! DON'T STOP!", "LEAD TAKEN! This is your run now!"],
    lost_lead:    ["Ghost took it back. Take it again. HARDER.", "Lost the lead. Unacceptable. FIGHT BACK."],
    distance_500m:["50 meters! Just getting started!", "First checkpoint! Legs are warm. NOW WE RUN."],
    distance_1km: ["100 METERS! You're a machine!", "Second checkpoint! Pain is temporary. Keep going!"],
    distance_2km: ["200 meters! Every step is a battle. WIN EVERY ONE.", "Third checkpoint! You're built for this!"],
    time_5min:    ["30 seconds of pure effort! Don't stop!", "30 sec! This is where champions are made!"],
    time_10min:   ["60 SECONDS! You're still here! FINISH STRONG!", "1 minute! Pain is temporary. Glory is forever!"],
  },
  SPECTER: {
    ahead_50:     ["Gap: +5m. Maintain current cadence.", "You are 5 meters ahead. Sustain output."],
    ahead_100:    ["Gap: +10m. Efficiency optimal. Hold pace.", "10 meter lead. Do not reduce cadence."],
    ahead_200:    ["Gap: +20m. Performance exceeds ghost baseline.", "20 meter advantage. Maintain current split."],
    behind_50:    ["You are 5 meters behind. Increase pace gradually.", "Gap: -5m. Adjust cadence by 5%."],
    behind_100:   ["Gap: -10m. Significant deficit. Increase output now.", "10 meters behind. Recalculate pace strategy."],
    behind_200:   ["Gap: -20m. Critical deficit. Maximum effort required.", "20 meter gap. Current pace insufficient. Accelerate."],
    closing_gap:  ["Gap reduced. Maintain current cadence.", "Efficiency improving. Keep this output."],
    gap_widening: ["Gap increasing. Pace drop detected. Correct now.", "Output declining. Increase stride frequency."],
    new_lead:     ["Lead acquired. Maintain pace to preserve advantage.", "You are now ahead. Sustain current split."],
    lost_lead:    ["Lead lost. Ghost pace exceeds yours. Recalibrate.", "Ghost retook lead. Increase output immediately."],
    distance_500m:["50 meters logged. Pace analysis: on target.", "First checkpoint complete. Maintain current efficiency."],
    distance_1km: ["100 meters complete. Split recorded.", "Second checkpoint logged. Cadence and pace within optimal range."],
    distance_2km: ["200 meters. Fatigue factor increasing. Adjust.", "Third checkpoint complete. Monitor pace drop risk."],
    time_5min:    ["30 seconds elapsed. Pace consistency: good.", "30 sec mark. Heart rate and pace nominal."],
    time_10min:   ["60 seconds. Endurance phase active. Maintain output.", "1 minute logged. You are still behind. Increase pace gradually."],
  },
};

const triggered = new Set();

export function getCoachMessage(coachAlias, event) {
  const key = `${coachAlias}_${event}`;
  if (triggered.has(key)) return null;
  triggered.add(key);

  const pool = messages[coachAlias]?.[event];
  if (!pool) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function resetCoachSession() {
  triggered.clear();
}
