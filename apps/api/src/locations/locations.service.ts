import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/enums/error-code.enum';
import { AppException } from '../common/exceptions/app.exception';
import { Location } from '../entities/location.entity';
import { Resource } from '../entities/resource.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
  ) {}

  async findAll(organizationId: string): Promise<LocationResponseDto[]> {
    const rows = await this.repo.find({
      where: { organizationId },
      order: { name: 'ASC' },
    });
    return rows.map((l) => this.toDto(l));
  }

  async create(
    organizationId: string,
    dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    if (dto.parentId) {
      const parent = await this.repo.findOne({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) {
        throw new AppException(
          ErrorCode.LOCATION_PARENT_NOT_FOUND,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
    const loc = this.repo.create({
      organizationId,
      name: dto.name,
      parentId: dto.parentId ?? null,
    });
    await this.repo.save(loc);
    return this.toDto(loc);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    const loc = await this.requireInOrg(organizationId, id);
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (dto.parentId) {
        const parent = await this.repo.findOne({
          where: { id: dto.parentId, organizationId },
        });
        if (!parent) {
          throw new AppException(
            ErrorCode.LOCATION_PARENT_NOT_FOUND,
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
      }
      loc.parentId = dto.parentId;
    }
    if (dto.name !== undefined) {
      loc.name = dto.name;
    }
    await this.repo.save(loc);
    return this.toDto(loc);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const loc = await this.requireInOrg(organizationId, id);
    const childCount = await this.repo.count({
      where: { parentId: id, organizationId },
    });
    if (childCount > 0) {
      throw new AppException(
        ErrorCode.LOCATION_HAS_DEPENDENTS,
        HttpStatus.CONFLICT,
      );
    }
    const resCount = await this.resources.count({
      where: { locationId: id, organizationId },
    });
    if (resCount > 0) {
      throw new AppException(
        ErrorCode.LOCATION_HAS_DEPENDENTS,
        HttpStatus.CONFLICT,
      );
    }
    await this.repo.delete(loc.id);
  }

  private async requireInOrg(
    organizationId: string,
    id: string,
  ): Promise<Location> {
    const loc = await this.repo.findOne({ where: { id, organizationId } });
    if (!loc) {
      throw new AppException(
        ErrorCode.LOCATION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return loc;
  }

  private toDto(l: Location): LocationResponseDto {
    return {
      id: l.id,
      name: l.name,
      parentId: l.parentId,
      createdAt: l.createdAt,
    };
  }
}
