import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import * as sharp from 'sharp';

export interface DetectionResult {
  boxes: BoundingBox[];
  confidence: number;
  processingTime: number;
}

export interface BoundingBox {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable()
export class DefectDetectionService implements OnModuleInit {
  private readonly logger = new Logger(DefectDetectionService.name);
  private session: ort.InferenceSession;
  private modelPath = './models/yolo-defect.onnx';
  private classes = [
    'scratch',
    'dent', 
    'discoloration',
    'missing_component',
    'misalignment',
    'contamination'
  ];

  async onModuleInit() {
    try {
      await this.loadModel();
    } catch (error) {
      this.logger.warn('Failed to load ONNX model, using mock detection', error.message);
    }
  }

  private async loadModel() {
    try {
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'], // Use CPU for demo, GPU for production
        logSeverityLevel: 3, // Error only
      });
      this.logger.log('ONNX model loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load ONNX model:', error.stack);
      throw error;
    }
  }

  async detectDefects(imageBuffer: Buffer): Promise<DetectionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.session) {
        // Fallback to mock detection if model not available
        return this.mockDetection();
      }

      // Preprocess image for YOLO
      const tensor = await this.preprocessImage(imageBuffer);
      
      // Run inference
      const results = await this.session.run({ images: tensor });
      
      // Parse YOLO output
      const boxes = this.parseYoloOutput(results);
      
      const processingTime = Date.now() - startTime;
      
      return {
        boxes,
        confidence: this.calculateOverallConfidence(boxes),
        processingTime,
      };
      
    } catch (error) {
      this.logger.error('Error during defect detection:', error.stack);
      // Fallback to mock detection
      return this.mockDetection();
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<ort.Tensor> {
    try {
      // Resize to YOLO input size (640x640)
      const { data, info } = await sharp(imageBuffer)
        .resize(640, 640)
        .rgb()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Convert to float32 and normalize (0-255 -> 0-1)
      const float32Data = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        float32Data[i] = data[i] / 255.0;
      }

      // Reshape to [1, 3, 640, 640] (NCHW format)
      const reshapedData = new Float32Array(1 * 3 * 640 * 640);
      
      // Convert HWC to CHW
      for (let c = 0; c < 3; c++) {
        for (let h = 0; h < 640; h++) {
          for (let w = 0; w < 640; w++) {
            reshapedData[c * 640 * 640 + h * 640 + w] = 
              float32Data[h * 640 * 3 + w * 3 + c];
          }
        }
      }

      return new ort.Tensor('float32', reshapedData, [1, 3, 640, 640]);
      
    } catch (error) {
      this.logger.error('Image preprocessing failed:', error.stack);
      throw error;
    }
  }

  private parseYoloOutput(results: any): BoundingBox[] {
    const output = results.output0;
    const boxes: BoundingBox[] = [];
    
    if (!output || !output.data) {
      return boxes;
    }

    // YOLO output format: [batch, detections, attributes]
    // attributes: [x, y, w, h, confidence, ...class_scores]
    const data = output.data;
    const numDetections = output.dims[1];
    const numAttributes = output.dims[2];
    
    const threshold = parseFloat(process.env.DEFECT_THRESHOLD) || 0.7;
    
    for (let i = 0; i < numDetections; i++) {
      const start = i * numAttributes;
      const confidence = data[start + 4];
      
      if (confidence > threshold) {
        // Find the class with highest score
        let maxClassScore = 0;
        let maxClassIndex = 0;
        
        for (let j = 5; j < numAttributes; j++) {
          if (data[start + j] > maxClassScore) {
            maxClassScore = data[start + j];
            maxClassIndex = j - 5;
          }
        }
        
        const finalConfidence = confidence * maxClassScore;
        
        if (finalConfidence > threshold && maxClassIndex < this.classes.length) {
          boxes.push({
            class: this.classes[maxClassIndex],
            confidence: finalConfidence,
            x: data[start + 0] - data[start + 2] / 2, // Convert center to top-left
            y: data[start + 1] - data[start + 3] / 2,
            width: data[start + 2],
            height: data[start + 3],
          });
        }
      }
    }
    
    // Apply Non-Maximum Suppression
    return this.applyNMS(boxes, 0.45);
  }

  private applyNMS(boxes: BoundingBox[], iouThreshold: number): BoundingBox[] {
    // Sort by confidence
    boxes.sort((a, b) => b.confidence - a.confidence);
    
    const keep: boolean[] = new Array(boxes.length).fill(true);
    
    for (let i = 0; i < boxes.length; i++) {
      if (!keep[i]) continue;
      
      for (let j = i + 1; j < boxes.length; j++) {
        if (!keep[j]) continue;
        
        const iou = this.calculateIoU(boxes[i], boxes[j]);
        if (iou > iouThreshold) {
          keep[j] = false;
        }
      }
    }
    
    return boxes.filter((_, index) => keep[index]);
  }

  private calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return intersection / union;
  }

  private calculateOverallConfidence(boxes: BoundingBox[]): number {
    if (boxes.length === 0) return 1.0; // No defects = 100% confidence
    
    // Return average confidence of detected defects
    const avgConfidence = boxes.reduce((sum, box) => sum + box.confidence, 0) / boxes.length;
    return 1.0 - avgConfidence; // Invert for quality score
  }

  private mockDetection(): DetectionResult {
    const boxes: BoundingBox[] = [];
    
    // Simulate occasional defects in demo mode
    const defectRate = parseFloat(process.env.DEMO_DEFECT_RATE) || 0.05;
    
    if (Math.random() < defectRate) {
      const defectTypes = this.classes;
      const randomDefect = defectTypes[Math.floor(Math.random() * defectTypes.length)];
      
      boxes.push({
        class: randomDefect,
        confidence: 0.7 + Math.random() * 0.3, // 70-100% confidence
        x: Math.random() * 0.6 + 0.2, // 20-80% of image width
        y: Math.random() * 0.6 + 0.2, // 20-80% of image height
        width: Math.random() * 0.15 + 0.05, // 5-20% of image
        height: Math.random() * 0.15 + 0.05,
      });
    }
    
    return {
      boxes,
      confidence: this.calculateOverallConfidence(boxes),
      processingTime: Math.random() * 50 + 20, // 20-70ms
    };
  }
}