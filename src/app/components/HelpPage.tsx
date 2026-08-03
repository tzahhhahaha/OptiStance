import { ChevronLeft, Camera, Upload, Book, MessageCircle, ChevronRight } from 'lucide-react';

interface HelpPageProps {
  onBack: () => void;
}

export function HelpPage({ onBack }: HelpPageProps) {
  const tutorials = [
    {
      icon: Camera,
      title: 'Using Real-time Camera',
      description: 'Learn how to use the camera for live pose detection',
      steps: [
        'Tap the camera button',
        'Allow camera permissions',
        'Position yourself in frame',
        'Follow the on-screen feedback',
        'Use the timer for capture',
      ],
    },
    {
      icon: Upload,
      title: 'Uploading Images',
      description: 'How to analyze poses from photos',
      steps: [
        'Open camera view',
        'Tap the upload button',
        'Select image from gallery',
        'Wait for analysis',
        'View detailed results',
      ],
    },
  ];

  const faqs = [
    {
      question: 'How accurate is the pose detection?',
      answer: 'Our MediaPipe-based system provides 85-95% accuracy for most poses when properly framed.',
    },
    {
      question: 'What should I wear for best results?',
      answer: 'Wear form-fitting clothes that contrast with your background for optimal detection.',
    },
    {
      question: 'Can I use this offline?',
      answer: 'The camera feature requires an internet connection for MediaPipe processing.',
    },
    {
      question: 'How do I improve my scores?',
      answer: 'Practice the recommended drills and focus on the detailed feedback for each pose.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="flex items-center gap-2 mb-4 text-white/90 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold">Help & Support</h1>
        <p className="text-purple-100 text-sm mt-1">Tutorials and frequently asked questions</p>
      </div>

      <div className="p-4 -mt-4">
        <div className="mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Book className="w-5 h-5 text-purple-600" />
            <span>Tutorials</span>
          </h3>

          {tutorials.map((tutorial, idx) => {
            const Icon = tutorial.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl shadow-lg p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{tutorial.title}</h4>
                    <p className="text-xs text-gray-500">{tutorial.description}</p>
                  </div>
                </div>
                <ol className="space-y-2 ml-4">
                  {tutorial.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-purple-600 font-medium">{stepIdx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <span>Frequently Asked Questions</span>
          </h3>

          <div className="bg-white rounded-2xl shadow-lg divide-y divide-gray-100">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group">
                <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-purple-50 transition-colors">
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h3 className="font-semibold mb-2">Still Need Help?</h3>
          <p className="text-sm text-purple-100 mb-4">
            Our support team is here to assist you
          </p>
          <button
            onClick={() => alert('Contact Support: support@cheerapp.com')}
            className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
