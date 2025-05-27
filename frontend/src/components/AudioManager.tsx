import React, { useState, useEffect, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import useGameStore from 'utils/gameStore';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

// Types for the different audio categories
interface AudioTrack {
  id: string;
  name: string;
  path: string;
  volume: number;
  loop: boolean;
}

type SoundEffect = {
  id: string;
  name: string;
  path: string;
  volume: number;
};

// Background music tracks based on time of day
const bgmTracks: AudioTrack[] = [
  {
    id: 'morning',
    name: 'Morning Vibes',
    path: '/audio/bgm/morning.mp3',
    volume: 0.4,
    loop: true,
  },
  {
    id: 'afternoon',
    name: 'Afternoon Flow',
    path: '/audio/bgm/afternoon.mp3',
    volume: 0.4,
    loop: true,
  },
  {
    id: 'evening',
    name: 'Evening Chill',
    path: '/audio/bgm/evening.mp3',
    volume: 0.4,
    loop: true,
  },
  {
    id: 'night',
    name: 'Night Lofi',
    path: '/audio/bgm/night.mp3',
    volume: 0.3,
    loop: true,
  },
];

// Sound effects
const soundEffects: Record<string, SoundEffect> = {
  click: {
    id: 'click',
    name: 'UI Click',
    path: '/audio/sfx/click.mp3',
    volume: 0.5,
  },
  success: {
    id: 'success',
    name: 'Success',
    path: '/audio/sfx/success.mp3',
    volume: 0.5,
  },
  notification: {
    id: 'notification',
    name: 'Notification',
    path: '/audio/sfx/notification.mp3',
    volume: 0.6,
  },
  error: {
    id: 'error',
    name: 'Error',
    path: '/audio/sfx/error.mp3',
    volume: 0.5,
  },
  meal: {
    id: 'meal',
    name: 'Meal Delivery',
    path: '/audio/sfx/meal.mp3',
    volume: 0.7,
  },
};

// Create a singleton pattern for audio triggers
let playSfxHandler: ((id: string) => void) | null = null;

// Function to play sound effects from anywhere in the app
export const playSfx = (id: string) => {
  if (playSfxHandler) {
    playSfxHandler(id);
  }
};

// AudioManager Component
const AudioManager: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bgmVolume, setBgmVolume] = useState<number>(0.4);
  const [sfxVolume, setSfxVolume] = useState<number>(0.6);
  const [currentBgm, setCurrentBgm] = useState<Howl | null>(null);
  const [loadedSfx, setLoadedSfx] = useState<Record<string, Howl>>({});
  const [currentTrackId, setCurrentTrackId] = useState<string>('morning');
  
  const { gameTime, isGameRunning } = useGameStore();
  
  // Initialize sound effects
  useEffect(() => {
    const sfx: Record<string, Howl> = {};
    
    // Load all sound effects
    Object.values(soundEffects).forEach((sound) => {
      sfx[sound.id] = new Howl({
        src: [sound.path],
        volume: sound.volume * sfxVolume,
        preload: true,
      });
    });
    
    setLoadedSfx(sfx);
    
    // Set up SFX handler
    playSfxHandler = (id: string) => {
      if (sfx[id] && !isMuted) {
        sfx[id].play();
      }
    };
    
    return () => {
      // Cleanup
      playSfxHandler = null;
      Object.values(sfx).forEach((sound) => {
        sound.unload();
      });
    };
  }, [sfxVolume, isMuted]);
  
  // Handle BGM track changes based on time of day
  useEffect(() => {
    if (!isGameRunning) return;
    
    // Determine appropriate track based on game hour
    const hour = gameTime.hour;
    let trackId = 'morning';
    
    if (hour >= 5 && hour < 12) {
      trackId = 'morning';
    } else if (hour >= 12 && hour < 18) {
      trackId = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      trackId = 'evening';
    } else {
      trackId = 'night';
    }
    
    // Only change if different from current track
    if (trackId !== currentTrackId) {
      // Fade out current track if exists
      if (currentBgm) {
        currentBgm.fade(currentBgm.volume(), 0, 1000);
        setTimeout(() => {
          currentBgm.stop();
          currentBgm.unload();
          switchTrack(trackId);
        }, 1000);
      } else {
        switchTrack(trackId);
      }
      
      setCurrentTrackId(trackId);
    }
  }, [gameTime.hour, isGameRunning, currentTrackId, currentBgm]);
  
  // Function to switch BGM tracks
  const switchTrack = useCallback((trackId: string) => {
    if (isMuted) return;
    
    const track = bgmTracks.find((t) => t.id === trackId);
    if (!track) return;
    
    const newTrack = new Howl({
      src: [track.path],
      volume: 0,
      loop: track.loop,
    });
    
    newTrack.once('load', () => {
      newTrack.play();
      newTrack.fade(0, track.volume * bgmVolume, 1000);
      setCurrentBgm(newTrack);
    });
    
    newTrack.on('loaderror', () => {
      console.error(`Error loading audio track: ${track.path}`);
    });
  }, [bgmVolume, isMuted]);
  
  // Toggle mute state
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      
      if (newMuted) {
        // Mute all sounds
        Howler.volume(0);
        if (currentBgm) {
          currentBgm.volume(0);
        }
      } else {
        // Restore volume
        Howler.volume(1);
        if (currentBgm) {
          const track = bgmTracks.find((t) => t.id === currentTrackId);
          if (track) {
            currentBgm.volume(track.volume * bgmVolume);
          }
        }
      }
      
      return newMuted;
    });
  }, [currentBgm, currentTrackId, bgmVolume]);
  
  // Handle BGM volume change
  const changeBgmVolume = useCallback((newVolume: number) => {
    setBgmVolume(newVolume);
    
    if (currentBgm && !isMuted) {
      const track = bgmTracks.find((t) => t.id === currentTrackId);
      if (track) {
        currentBgm.volume(track.volume * newVolume);
      }
    }
  }, [currentBgm, currentTrackId, isMuted]);
  
  // Handle SFX volume change
  const changeSfxVolume = useCallback((newVolume: number) => {
    setSfxVolume(newVolume);
    
    // Update all loaded sound effects with new volume
    Object.keys(loadedSfx).forEach((key) => {
      const sound = loadedSfx[key];
      const effect = soundEffects[key];
      if (sound && effect) {
        sound.volume(effect.volume * newVolume);
      }
    });
  }, [loadedSfx]);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2">
      <button 
        onClick={toggleMute}
        className="w-10 h-10 rounded-full bg-stone-800/70 text-white flex items-center justify-center hover:bg-stone-700/80 transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX size={18} />
        ) : bgmVolume > 0.5 ? (
          <Volume2 size={18} />
        ) : (
          <Volume1 size={18} />
        )}
      </button>
    </div>
  );
};

export default AudioManager; 