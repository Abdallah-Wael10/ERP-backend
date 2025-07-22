import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    userId: string,
    userRole: string,
  ): Promise<Product> {
    // Only inventory and superadmin can create products
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can create products',
      );
    }

    // Check if product with same title already exists
    const existingProduct = await this.productModel.findOne({
      title: createProductDto.title,
    });
    if (existingProduct) {
      throw new ConflictException('Product with this title already exists');
    }

    const product = new this.productModel({
      ...createProductDto,
      createdBy: userId,
    });

    return product.save();
  }

  async findAll(userRole: string): Promise<Product[]> {
    // Only inventory and superadmin can view products
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can view products',
      );
    }

    return this.productModel
      .find()
      .populate('createdBy', 'fullName email role')
      .exec();
  }

  async findOne(id: string, userRole: string): Promise<Product> {
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can view products',
      );
    }

    const product = await this.productModel
      .findById(id)
      .populate('createdBy', 'fullName email role')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userRole: string,
  ): Promise<Product> {
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can update products',
      );
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check title uniqueness if title is being updated
    if (updateProductDto.title && updateProductDto.title !== product.title) {
      const existingProduct = await this.productModel.findOne({
        title: updateProductDto.title,
        _id: { $ne: id },
      });
      if (existingProduct) {
        throw new ConflictException('Product with this title already exists');
      }
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .populate('createdBy', 'fullName email role')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async remove(id: string, userRole: string): Promise<{ message: string }> {
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can delete products',
      );
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productModel.findByIdAndDelete(id);
    return { message: 'Product deleted successfully' };
  }

  async reduceQuantity(
    id: string,
    quantity: number,
    userRole: string,
  ): Promise<Product> {
    if (!['inventory', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only inventory team and superadmin can reduce quantity',
      );
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.qty < quantity) {
      throw new ConflictException('Insufficient quantity in stock');
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $inc: { qty: -quantity } }, { new: true })
      .populate('createdBy', 'fullName email role')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }
}
