const messages = {
  DREDD: {
    ahead_50:     ["That ghost is not even fast. Go prove it.", "You're ahead. Don't get comfortable."],
    ahead_100:    ["100 meters. Don't waste it.", "Keep the gap. No mercy."],
    ahead_200:    ["Ghost is dust. Finish it.", "200 meters. You own this run."],
    behind_50:    ["You call that chasing? Pick it up.", "50 meters behind. Embarrassing. Move."],
    behind_100:   ["Ghost is pulling away. Wake up.", "100 meters. That's not a gap, that's a statement."],
    behind_200:   ["Ghost is gone. Unless you do something NOW.", "200 meters down. You still have legs, use them."],
    closing_gap:  ["Better. Now don't waste it.", "Gap closing. Keep that energy."],
    gap_widening: ["You're slowing down. I can see it.", "Gap growing. That's on you."],
    new_lead:     ["There it is. You took the lead. HOLD IT.", "Finally. Now don't blow it."],
    lost_lead:    ["You had it. You lost it. Unacceptable.", "Ghost took the lead back. Fix that."],
    distance_500m:["500 meters. You're just warming up.", "Half a km. Ghost is watching."],
    distance_1km: ["1K done. Ghost isn't impressed yet.", "One kilometer. Keep the pressure."],
    distance_2km: ["2K. You're still here. Good.", "Two kilometers in. Don't fade now."],
    time_5min:    ["5 minutes. Ghost has been running longer. Catch up.", "5 min in. Pace check — is that all you've got?"],
    time_10min:   ["10 minutes. You better be hurting.", "10 min. This is where weak runners quit."],
  },
  KIRA: {
    ahead_50:     ["Breathe in. Stay light. You're closing the gap.", "You're ahead. Let the rhythm carry you."],
    ahead_100:    ["100 meters of space. Breathe and hold.", "The gap is yours. Stay present."],
    ahead_200:    ["200 meters. You found your flow.", "Deep breath. You are in control."],
    behind_50:    ["No panic. Small steps, steady pace.", "The ghost is close. Breathe through it."],
    behind_100:   ["Let the rhythm carry you forward.", "100 meters. One breath at a time."],
    behind_200:   ["The ghost runs ahead. You run your own race.", "200 meters. Release the tension. Find your stride."],
    closing_gap:  ["You're closing in. Stay soft, stay steady.", "The gap shrinks. Trust your body."],
    gap_widening: ["The gap grows. Return to your breath.", "Slow down inside. Speed up outside."],
    new_lead:     ["You've taken the lead. Stay grounded.", "The lead is yours. Breathe and hold it."],
    lost_lead:    ["The ghost leads now. That's okay. Recenter.", "Lost the lead. Breathe. Find your pace again."],
    distance_500m:["500 meters. Your body knows the way.", "Half a kilometer. Stay in the moment."],
    distance_1km: ["One kilometer. You are exactly where you need to be.", "1K. Breathe. You're doing well."],
    distance_2km: ["Two kilometers. Your stride is your meditation.", "2K. Stay light. Stay present."],
    time_5min:    ["5 minutes of movement. Honor that.", "5 min. Your breath is the metronome."],
    time_10min:   ["10 minutes. You've found your rhythm.", "10 min. Let your legs follow your breath."],
  },
  TITAN: {
    ahead_50:     ["Push now. This is where you take control.", "You're ahead. Don't let the ghost breathe."],
    ahead_100:    ["100 meters! You're stronger than this pace.", "Gap is 100. EXTEND IT."],
    ahead_200:    ["200 meters ahead! You're dominating this run!", "BEAST MODE. 200 meters. Keep going!"],
    behind_50:    ["Break the gap. Own the run.", "50 meters? That's nothing. CHARGE."],
    behind_100:   ["100 meters behind. Time to unleash.", "Ghost is ahead. You're stronger. PROVE IT."],
    behind_200:   ["200 meters. This is your comeback moment. GO.", "Ghost thinks it won. Show it otherwise. NOW."],
    closing_gap:  ["YES! Gap closing! MORE!", "That's the energy! Keep attacking!"],
    gap_widening: ["Gap growing. Dig deeper. You have more.", "Don't let the ghost escape. PUSH."],
    new_lead:     ["YOU TOOK THE LEAD! DON'T STOP!", "LEAD TAKEN! This is your run now!"],
    lost_lead:    ["Ghost took it back. Take it again. HARDER.", "Lost the lead. Unacceptable. FIGHT BACK."],
    distance_500m:["500 meters! Just getting started!", "Half a km! Legs are warm. NOW WE RUN."],
    distance_1km: ["1 KILOMETER! You're a machine!", "1K! Pain is temporary. Keep going!"],
    distance_2km: ["2K! Every step is a battle. WIN EVERY ONE.", "Two kilometers! You're built for this!"],
    time_5min:    ["5 minutes of pure effort! Don't stop!", "5 min! This is where champions are made!"],
    time_10min:   ["10 MINUTES! You're still here! FINISH STRONG!", "10 min! Pain is temporary. Glory is forever!"],
  },
  SPECTER: {
    ahead_50:     ["Gap: +50m. Maintain current cadence.", "You are 50 meters ahead. Sustain output."],
    ahead_100:    ["Gap: +100m. Efficiency optimal. Hold pace.", "100 meter lead. Do not reduce cadence."],
    ahead_200:    ["Gap: +200m. Performance exceeds ghost baseline.", "200 meter advantage. Maintain current split."],
    behind_50:    ["You are 50 meters behind. Increase pace gradually.", "Gap: -50m. Adjust cadence by 5%."],
    behind_100:   ["Gap: -100m. Significant deficit. Increase output now.", "100 meters behind. Recalculate pace strategy."],
    behind_200:   ["Gap: -200m. Critical deficit. Maximum effort required.", "200 meter gap. Current pace insufficient. Accelerate."],
    closing_gap:  ["Gap reduced. Maintain current cadence.", "Efficiency improving. Keep this output."],
    gap_widening: ["Gap increasing. Pace drop detected. Correct now.", "Output declining. Increase stride frequency."],
    new_lead:     ["Lead acquired. Maintain pace to preserve advantage.", "You are now ahead. Sustain current split."],
    lost_lead:    ["Lead lost. Ghost pace exceeds yours. Recalibrate.", "Ghost retook lead. Increase output immediately."],
    distance_500m:["500 meters logged. Pace analysis: on target.", "0.5 km complete. Maintain current efficiency."],
    distance_1km: ["1 kilometer complete. Split recorded.", "1K logged. Cadence and pace within optimal range."],
    distance_2km: ["2 kilometers. Fatigue factor increasing. Adjust.", "2K complete. Monitor pace drop risk."],
    time_5min:    ["5 minutes elapsed. Pace consistency: good.", "5 min mark. Heart rate and pace nominal."],
    time_10min:   ["10 minutes. Endurance phase active. Maintain output.", "10 min logged. You are 23 meters behind. Increase pace gradually."],
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

export function speakMessage(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}
