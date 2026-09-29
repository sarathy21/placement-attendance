import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';

export interface FcmMulticastResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  errors: any[];
}

export interface MockSentMulticast {
  tokens: string[];
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: App | null = null;
  private isMock = false;

  // Mock tracking for unit / E2E tests
  private mockSentMulticasts: MockSentMulticast[] = [];

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    if (process.env.NODE_ENV === 'test') {
      this.isMock = true;
      this.logger.log('FcmService running in MOCK mode (NODE_ENV=test)');
      return;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;

    try {
      if (serviceAccountJson) {
        let creds;
        if (serviceAccountJson.trim().startsWith('{')) {
          creds = JSON.parse(serviceAccountJson);
        } else {
          const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf8');
          creds = JSON.parse(decoded);
        }

        this.firebaseApp = initializeApp({
          credential: cert(creds),
        });
        this.logger.log('Firebase Admin SDK initialized successfully from JSON environment variable');
      } else if (credentialsPath) {
        this.firebaseApp = initializeApp({
          credential: cert(credentialsPath),
        });
        this.logger.log('Firebase Admin SDK initialized successfully from credentials file path');
      } else {
        this.isMock = true;
        this.logger.warn('No Firebase credentials provided. FcmService running in MOCK mode');
      }
    } catch (error) {
      this.isMock = true;
      this.logger.error('Failed to initialize Firebase Admin SDK. Falling back to MOCK mode', error);
    }
  }

  public getIsMock(): boolean {
    return this.isMock;
  }

  public setIsMock(mock: boolean) {
    this.isMock = mock;
  }

  public getSentMulticasts(): MockSentMulticast[] {
    return this.mockSentMulticasts;
  }

  public clearMockHistory() {
    this.mockSentMulticasts = [];
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    payload: Record<string, string> = {},
  ): Promise<FcmMulticastResult> {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [], errors: [] };
    }

    const maxBatchSize = 500;
    const result: FcmMulticastResult = {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      errors: [],
    };

    for (let i = 0; i < tokens.length; i += maxBatchSize) {
      const batchTokens = tokens.slice(i, i + maxBatchSize);

      if (this.isMock || !this.firebaseApp) {
        const mockRes = this.sendMockMulticast(batchTokens, title, body, payload);
        result.successCount += mockRes.successCount;
        result.failureCount += mockRes.failureCount;
        result.invalidTokens.push(...mockRes.invalidTokens);
        result.errors.push(...mockRes.errors);
      } else {
        const messaging = getMessaging(this.firebaseApp);
        const message: MulticastMessage = {
          tokens: batchTokens,
          notification: { title, body },
          data: payload,
        };

        try {
          const response = await messaging.sendEachForMulticast(message);
          result.successCount += response.successCount;
          result.failureCount += response.failureCount;

          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const errorCode = resp.error.code;
              result.errors.push({ token: batchTokens[idx], code: errorCode, message: resp.error.message });
              if (
                errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token'
              ) {
                result.invalidTokens.push(batchTokens[idx]);
              }
            }
          });
        } catch (error) {
          this.logger.error('Error sending FCM multicast batch', error);
          result.failureCount += batchTokens.length;
          result.errors.push({ code: 'messaging/internal-error', message: String(error) });
        }
      }
    }

    return result;
  }

  private sendMockMulticast(
    tokens: string[],
    title: string,
    body: string,
    payload: Record<string, string>,
  ): FcmMulticastResult {
    this.mockSentMulticasts.push({
      tokens: [...tokens],
      notification: { title, body },
      data: { ...payload },
    });

    const invalidTokens: string[] = [];
    const errors: any[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const token of tokens) {
      if (token === 'INVALID_TOKEN' || token.startsWith('INVALID_')) {
        failureCount++;
        invalidTokens.push(token);
        errors.push({
          token,
          code: 'messaging/registration-token-not-registered',
          message: 'The registration token is not registered',
        });
      } else {
        successCount++;
      }
    }

    return {
      successCount,
      failureCount,
      invalidTokens,
      errors,
    };
  }
}
