import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, TrendingUp, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ProfileType } from '@/types/core/database';

interface ProfileTypeOption {
  value: ProfileType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const profileTypeOptions: ProfileTypeOption[] = [
  {
    value: 'issuer' as ProfileType,
    label: 'Issuer',
    description: 'Issue, manage and distribute tokenized assets',
    icon: FileText,
  },
  {
    value: 'investor' as ProfileType,
    label: 'Investor',
    description: 'Subscribe, manage and redeem tokenized assets',
    icon: TrendingUp,
  },
  {
    value: 'service provider' as ProfileType,
    label: 'Service Provider',
    description: 'Provide services and manage clients',
    icon: Settings,
  },
  {
    value: 'super admin' as ProfileType,
    label: 'Super Admin',
    description: 'Full platform administration and management',
    icon: Shield,
  },
];

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProfileType, setSelectedProfileType] = useState<ProfileType | null>(null);

  const handleProfileTypeSelection = (profileType: ProfileType) => {
    setSelectedProfileType(profileType);
    // Store the selected profile type for use in the login process
    sessionStorage.setItem('selectedProfileType', profileType);
    // Navigate to login page
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Geometric Background with Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: 'url(/cubes.jpg)' }}
        />
        
        {/* Content Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-white">
          <div className="text-center px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
            <h1 className="font-lora text-2xl lg:text-4xl font-bold text-white mb-4 whitespace-nowrap">
              Modernizes Private Markets
            </h1>
            <p className="font-manrope text-lg lg:text-xl text-gray-300">
              <span className="block">Chain Capital's tokenized asset management platform</span>
              <span className="block whitespace-nowrap">unlocks capital that will accelerate the growth of private markets.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Profile Type Selection */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo/Title for small screens */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-lora text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-2 leading-tight">
              Modernising Private Markets
            </h1>
            <p className="font-manrope text-sm sm:text-base text-gray-600 leading-relaxed">
              Chain Capital's tokenized asset management platform unlocks
              capital that will accelerate the growth of private markets.
            </p>
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block mb-8 text-center">
            <h1 className="font-lora text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-2 leading-tight">
              Welcome to Chain Capital
            </h1>
            <p className="font-manrope text-gray-600">
              Choose your account type to access the platform
            </p>
          </div>

          {/* Profile Type Options */}
          <div className="space-y-4">
            {profileTypeOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card
                  key={option.value}
                  className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => handleProfileTypeSelection(option.value)}
                >
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-manrope font-semibold text-lg text-gray-900">
                          {option.label}
                        </h3>
                        <p className="font-manrope text-sm text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;