import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Volume2, Music, Volume } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  bgmVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  onChangeBgmVolume: (value: number) => void;
  onChangeSfxVolume: (value: number) => void;
  onToggleMute: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  bgmVolume,
  sfxVolume,
  isMuted,
  onChangeBgmVolume,
  onChangeSfxVolume,
  onToggleMute,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-5 space-y-6">
              {/* Audio Settings */}
              <div className="space-y-4">
                <h4 className="text-md font-medium">Audio Settings</h4>
                
                {/* Master Audio Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume className="w-5 h-5 text-stone-600" />
                    <Label htmlFor="master-volume">Master Audio</Label>
                  </div>
                  <Switch
                    id="master-volume"
                    checked={!isMuted}
                    onCheckedChange={() => onToggleMute()}
                  />
                </div>
                
                {/* BGM Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Music className="w-5 h-5 text-stone-600" />
                      <Label htmlFor="bgm-volume">Music Volume</Label>
                    </div>
                    <span className="text-xs text-stone-500">
                      {Math.round(bgmVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="bgm-volume"
                    defaultValue={[bgmVolume]}
                    max={1}
                    step={0.05}
                    disabled={isMuted}
                    onValueChange={(value) => onChangeBgmVolume(value[0])}
                  />
                </div>
                
                {/* SFX Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-5 h-5 text-stone-600" />
                      <Label htmlFor="sfx-volume">Sound Effects</Label>
                    </div>
                    <span className="text-xs text-stone-500">
                      {Math.round(sfxVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="sfx-volume"
                    defaultValue={[sfxVolume]}
                    max={1}
                    step={0.05}
                    disabled={isMuted}
                    onValueChange={(value) => onChangeSfxVolume(value[0])}
                  />
                </div>
              </div>
              
              {/* Add more settings sections here */}
              
              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <Button onClick={onClose} className="bg-orange-500 hover:bg-orange-600">
                  Save Settings
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsMenu; 