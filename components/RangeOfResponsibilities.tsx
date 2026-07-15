import { promises as fs } from 'fs';
import path from 'path';

interface RangeOfResponsibilitiesProps {
  linkUrl?: string;
  className?: string;
}

export default async function RangeOfResponsibilities({ 
  linkUrl = 'https://www.buyfacts.com/',
  className = ''
}: RangeOfResponsibilitiesProps) {
  const filePath = path.join(process.cwd(), 'public', 'RangeOfResponsibilities.svg');
  
  try {
    let svgContent = await fs.readFile(filePath, 'utf8');
    
    // Replace the default url with the provided linkUrl
    if (linkUrl !== 'https://www.buyfacts.com/') {
      svgContent = svgContent.replaceAll('https://www.buyfacts.com/', linkUrl);
    }
    
    return (
      <div 
        className={`range-of-responsibilities-svg-container ${className}`}
        dangerouslySetInnerHTML={{ __html: svgContent }} 
        style={{ width: '100%', height: 'auto', display: 'flex', justifyContent: 'center' }}
      />
    );
  } catch (error) {
    console.error('Error loading RangeOfResponsibilities SVG:', error);
    return <div className="error-message">Failed to load graphic.</div>;
  }
}
